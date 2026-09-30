package apierror

import (
	"encoding/json"
	"net/http"

	"github.com/rs/zerolog/log"
)

type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func Write(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(APIError{Code: code, Message: message})
}

func BadRequest(w http.ResponseWriter, message string) {
	Write(w, http.StatusBadRequest, "BAD_REQUEST", message)
}

func Unauthorized(w http.ResponseWriter, message string) {
	if message == "" {
		message = "authentication required"
	}
	Write(w, http.StatusUnauthorized, "UNAUTHORIZED", message)
}

func Forbidden(w http.ResponseWriter, message string) {
	if message == "" {
		message = "insufficient permissions"
	}
	Write(w, http.StatusForbidden, "FORBIDDEN", message)
}

func NotFound(w http.ResponseWriter, entity string) {
	Write(w, http.StatusNotFound, "NOT_FOUND", entity+" not found")
}

func InternalError(w http.ResponseWriter, errs ...error) {
	for _, err := range errs {
		if err != nil {
			log.Error().Err(err).Msg("internal error occurred")
		}
	}
	// errs accepted but never exposed to client — prevents leaking stack traces
	Write(w, http.StatusInternalServerError, "INTERNAL_ERROR", "an unexpected error occurred")
}

func Conflict(w http.ResponseWriter, message string) {
	Write(w, http.StatusConflict, "CONFLICT", message)
}
