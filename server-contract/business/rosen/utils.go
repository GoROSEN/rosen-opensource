package rosen

import (
	"math"
)

func mintLimit(dailyMintLimit uint32, health float64) uint32 {
	return uint32(float64(dailyMintLimit) * math.Max(0.1, math.Min(1.0, (health-0.30)/0.66)))
}
