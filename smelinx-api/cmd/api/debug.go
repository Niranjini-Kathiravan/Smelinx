package main

import (
	"encoding/json"
	"net/http"
)

func debugCookiesHandler(w http.ResponseWriter, r *http.Request) {
	type C struct {
		Name  string `json:"name"`
		Value string `json:"value"`
	}
	var out []C
	for _, c := range r.Cookies() {
		out = append(out, C{Name: c.Name, Value: c.Value})
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}
