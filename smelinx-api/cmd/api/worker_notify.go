package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"
)

// consoleMailer is a fallback when SENDGRID_API_KEY is not set.
type consoleMailer struct{}

func (consoleMailer) Send(to, subject, html string) error {
	log.Printf("[mailer] to=%s subject=%q html=%q", to, subject, html)
	return nil
}

func getenvInt(name string, def int) int {
	v := strings.TrimSpace(os.Getenv(name))
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return def
	}
	return n
}

// startNotificationDispatcher runs a periodic loop that picks due notifications
// and sends emails.
func startNotificationDispatcher(store *Store, mailer Mailer) {
	interval := 30 * time.Second // check every 30s
	batchLimit := 50

	go func() {
		log.Printf("[notify] dispatcher started (interval=%s)", interval)
		t := time.NewTicker(interval)
		defer t.Stop()

		for {
			if err := dispatchOnce(store, mailer, batchLimit); err != nil {
				log.Printf("[notify] dispatch error: %v", err)
			}
			<-t.C
		}
	}()
}

func dispatchOnce(store *Store, mailer Mailer, limit int) error {
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()

	due, err := store.ListDueNotifications(ctx, limit)
	if err != nil {
		return err
	}
	if len(due) == 0 {
		log.Printf("[notify] no due notifications (now=%s UTC)", time.Now().UTC().Format(time.RFC3339))
		return nil
	}

	log.Printf("[notify] found %d due notification(s)", len(due))

	maxAttempts := getenvInt("NOTIFY_MAX_ATTEMPTS", 6)
	base := time.Duration(getenvInt("NOTIFY_BACKOFF_BASE_SECS", 60)) * time.Second
	maxBackoff := time.Duration(getenvInt("NOTIFY_BACKOFF_MAX_SECS", 3600)) * time.Second

	for _, d := range due {
		to := firstNonEmpty(d.ContactEmail.String, getenv("SENDGRID_TEST_TO", ""))
		if strings.TrimSpace(to) == "" {
			log.Printf("[notify] skip note=%s api=%s (no contact email and no SENDGRID_TEST_TO)", d.NoteID, d.APIID)
			continue
		}

		subj := buildSubject(d)
		body := buildHTML(d)

		if err := mailer.Send(to, subj, body); err != nil {
			// compute backoff and reschedule
			nextAttempts := d.Attempts + 1
			backoff := base << (nextAttempts - 1) // exp2
			if backoff > maxBackoff {
				backoff = maxBackoff
			}
			next := time.Now().UTC().Add(backoff)
			msg := truncate(fmt.Sprintf("send failed: %v", err), 500)

			if nextAttempts >= maxAttempts {
				_ = store.AutoCancelNotification(ctx, d.NoteID, "auto-canceled after max attempts; last error: "+msg)
				log.Printf("[notify] auto-canceled note=%s after %d attempts", d.NoteID, nextAttempts)
				continue
			}

			if e := store.ScheduleNotificationRetry(ctx, d.NoteID, next, nextAttempts, msg); e != nil {
				log.Printf("[notify] schedule retry failed note=%s: %v", d.NoteID, e)
			} else {
				log.Printf("[notify] will retry note=%s at=%s (attempt=%d)", d.NoteID, next.Format(time.RFC3339), nextAttempts)
			}
			continue
		}

		if err := store.MarkNotificationSent(ctx, d.NoteID); err != nil {
			log.Printf("[notify] mark sent failed note=%s: %v", d.NoteID, err)
		} else {
			log.Printf("[notify] sent note=%s to=%s", d.NoteID, to)
		}
	}

	return nil
}

func buildSubject(d dueNotification) string {
	switch d.Type {
	case "deprecate":
		return fmt.Sprintf("[Smelinx] Deprecation notice – %s %s", d.APIName, d.Version)
	case "sunset":
		return fmt.Sprintf("[Smelinx] Sunset notice – %s %s", d.APIName, d.Version)
	default:
		return fmt.Sprintf("[Smelinx] Notice – %s %s", d.APIName, d.Version)
	}
}

func buildHTML(d dueNotification) string {
	var b strings.Builder
	title := "API Notice"
	switch d.Type {
	case "deprecate":
		title = "Deprecation Notice"
	case "sunset":
		title = "Sunset Notice"
	}

	fmt.Fprintf(&b, `<div style="font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111">`)
	fmt.Fprintf(&b, `<h2 style="margin:0 0 12px 0">%s</h2>`, htmlEsc(title))
	fmt.Fprintf(&b, `<p style="margin:0 0 8px 0"><b>API:</b> %s<br/>`, htmlEsc(d.APIName))
	fmt.Fprintf(&b, `<b>Version:</b> %s<br/>`, htmlEsc(d.Version))
	fmt.Fprintf(&b, `<b>Scheduled at:</b> %s</p>`, d.ScheduledAt.Format(time.RFC1123))

	if d.BaseURL.Valid && strings.TrimSpace(d.BaseURL.String) != "" {
		fmt.Fprintf(&b, `<p style="margin:8px 0"><b>Base URL:</b> <a href="%s">%s</a></p>`, htmlAttr(d.BaseURL.String), htmlEsc(d.BaseURL.String))
	}
	if d.DocsURL.Valid && strings.TrimSpace(d.DocsURL.String) != "" {
		fmt.Fprintf(&b, `<p style="margin:8px 0"><b>Docs:</b> <a href="%s">%s</a></p>`, htmlAttr(d.DocsURL.String), htmlEsc(d.DocsURL.String))
	}

	fmt.Fprintf(&b, `<p style="margin-top:16px">If you have questions, please reply to this email.</p>`)
	fmt.Fprintf(&b, `</div>`)
	return b.String()
}

// tiny helpers

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func htmlEsc(s string) string {
	repl := strings.NewReplacer(
		"&", "&amp;",
		"\"", "&quot;",
		"<", "&lt;",
		">", "&gt;",
	)
	return repl.Replace(s)
}

func htmlAttr(s string) string {
	return htmlEsc(s)
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}
