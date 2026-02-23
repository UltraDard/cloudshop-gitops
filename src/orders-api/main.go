package main

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	http.Handle("/metrics", promhttp.Handler())

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	http.HandleFunc("/orders", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]map[string]interface{}{
			{"id": 1, "total": 100},
		})
	})

	http.ListenAndServe(":"+port, nil)
}
