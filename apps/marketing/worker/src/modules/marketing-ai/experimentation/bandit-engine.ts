export interface VariantState {
  variantId: string;
  name: string;
  successes: number; // Alpha
  failures: number;  // Beta
  currentWeight: number; // Allocated weight 0.0 - 1.0
}

export class MultiArmedBanditEngine {
  private explorationFloor = 0.05; // 5% minimum exploration floor
  private maxStepChange = 0.15;    // Max 15% shift per reallocation cycle

  /**
   * Sample from Beta distribution using Thompson Sampling
   */
  private sampleBeta(alpha: number, beta: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    // Simple Gaussian approximation of Beta for Thompson Sampling
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
    const stdDev = Math.sqrt(variance);
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return Math.max(0.001, Math.min(0.999, mean + z * stdDev));
  }

  public computeReallocations(variants: VariantState[]): VariantState[] {
    if (variants.length <= 1) return variants;

    // Draw Thompson samples
    const samples = variants.map(v => ({
      variantId: v.variantId,
      sample: this.sampleBeta(v.successes + 1, v.failures + 1)
    }));

    // Find winning variant in this round
    samples.sort((a, b) => b.sample - a.sample);
    const winnerId = samples[0].variantId;

    const updatedVariants = variants.map(v => {
      let targetWeight = v.variantId === winnerId ? 0.70 : (0.30 / (variants.length - 1));
      
      // Enforce Exploration Floor
      targetWeight = Math.max(this.explorationFloor, targetWeight);

      // Enforce Max Allocation Shift Guardrail
      const diff = targetWeight - v.currentWeight;
      const boundedDiff = Math.max(-this.maxStepChange, Math.min(this.maxStepChange, diff));
      const finalWeight = Number((v.currentWeight + boundedDiff).toFixed(4));

      return {
        ...v,
        currentWeight: finalWeight
      };
    });

    // Normalize weights so sum = 1.0
    const totalWeight = updatedVariants.reduce((sum, v) => sum + v.currentWeight, 0);
    return updatedVariants.map(v => ({
      ...v,
      currentWeight: Number((v.currentWeight / totalWeight).toFixed(4))
    }));
  }
}
