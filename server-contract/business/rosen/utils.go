package rosen

import (
	"math"
)

func mintLimit(dailyMintLimit uint32, health float64) uint32 {
	return uint32(float64(dailyMintLimit) * math.Max(0.1, math.Min(1.0, (health-0.30)/0.66)))
}

func contains[T int | uint | int16 | uint16 | int32 | uint32 | int64 | uint64 | float32 | float64 | string](array []T, element T) bool {

	for i := range array {
		if element == array[i] {
			return true
		}
	}
	return false
}
