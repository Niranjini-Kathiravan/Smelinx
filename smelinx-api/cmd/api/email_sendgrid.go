package main

import (
	"errors"
	"os"
	"regexp"
	"strings"

	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

type Mailer interface {
	Send(to, subject, html string) error
}

type SendGridMailer struct {
	client *sendgrid.Client
	from   string
	name   string
}

func NewSendGridMailer() (*SendGridMailer, error) {
	apiKey := os.Getenv("SENDGRID_API_KEY")
	from := os.Getenv("SENDGRID_FROM")
	if apiKey == "" || from == "" {
		return nil, errors.New("SENDGRID_API_KEY or SENDGRID_FROM missing")
	}
	name := os.Getenv("SENDGRID_FROM_NAME")
	return &SendGridMailer{
		client: sendgrid.NewSendClient(apiKey),
		from:   from,
		name:   name,
	}, nil
}

func (m *SendGridMailer) Send(to, subject, htmlStr string) error {
	from := mail.NewEmail(m.name, m.from)
	toAddr := mail.NewEmail("", to)
	plain := htmlToText(htmlStr)
	msg := mail.NewSingleEmail(from, subject, toAddr, plain, htmlStr)
	_, err := m.client.Send(msg)
	return err
}

// naive HTML->text for plaintext part
var tagRe = regexp.MustCompile(`(?s)<[^>]+>`)

func htmlToText(s string) string {
	// Replace <br>, <p>, <li> with newlines first
	repl := strings.NewReplacer(
		"<br>", "\n", "<br/>", "\n", "<br />", "\n",
		"</p>", "\n\n", "</li>", "\n",
	)
	s = repl.Replace(s)
	// Strip other tags
	s = tagRe.ReplaceAllString(s, "")
	// Collapse spaces
	return strings.TrimSpace(strings.ReplaceAll(s, "  ", " "))
}
