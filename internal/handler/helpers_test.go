package handler

import (
	"net/http/httptest"
	"testing"
)

func TestPagination(t *testing.T) {
	cases := []struct {
		query                 string
		wantLimit, wantOffset int
	}{
		{"", 20, 0},
		{"?limit=5&offset=10", 5, 10},
		{"?limit=100000", 100, 0}, // clamped
		{"?limit=-3&offset=-1", 20, 0},
		{"?limit=abc", 20, 0},
	}
	for _, c := range cases {
		r := httptest.NewRequest("GET", "/products"+c.query, nil)
		limit, offset := pagination(r, 20, 100)
		if limit != c.wantLimit || offset != c.wantOffset {
			t.Errorf("%q: got (%d,%d), want (%d,%d)", c.query, limit, offset, c.wantLimit, c.wantOffset)
		}
	}
}
