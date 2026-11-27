"""vLLM quantization serving flags, VRAM budget, and TCO break-even calculator (Chapter 09)."""

from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class QuantProfile:
    method: str
    bits: int
    vllm_flags: List[str]
    fp16_quality_retention: float  # e.g. 0.992 = 99.2% of FP16


QUANT_PROFILES: Dict[str, QuantProfile] = {
    "fp16": QuantProfile("fp16", 16, ["--dtype", "float16"], 1.000),
    "fp8": QuantProfile("fp8", 8, ["--quantization", "fp8", "--kv-cache-dtype", "fp8"], 0.996),
    "awq": QuantProfile("awq", 4, ["--quantization", "awq_marlin", "--dtype", "half"], 0.990),
    "gptq": QuantProfile("gptq", 4, ["--quantization", "gptq_marlin", "--dtype", "half"], 0.985),
    "int4": QuantProfile("int4", 4, ["--quantization", "bitsandbytes", "--load-format", "bitsandbytes"], 0.955),
}


def build_vllm_serve_cmd(
    model_id: str,
    quant: str = "awq",
    gpu_mem_util: float = 0.90,
    max_model_len: int = 8192,
    enable_prefix_caching: bool = True,
    enable_chunked_prefill: bool = True,
) -> List[str]:
    """Build a production `vllm serve` command with PagedAttention & quantization flags."""
    profile = QUANT_PROFILES[quant]
    cmd = [
        "vllm",
        "serve",
        model_id,
        *profile.vllm_flags,
        "--gpu-memory-utilization",
        str(gpu_mem_util),
        "--max-model-len",
        str(max_model_len),
    ]
    if enable_prefix_caching:
        cmd.append("--enable-prefix-caching")
    if enable_chunked_prefill:
        cmd.append("--enable-chunked-prefill")
    return cmd


def estimate_weight_vram_gb(params_billions: float, quant: str) -> float:
    """Estimate model weight VRAM footprint in GB."""
    bits = QUANT_PROFILES[quant].bits
    return round(params_billions * (bits / 8.0), 2)


def tco_breakeven_tokens_millions(
    gpu_hourly_usd: float,
    hosted_price_per_1m_usd: float,
    hours_per_month: int = 730,
) -> float:
    """Compute monthly token volume (in millions) where self-hosting breaks even with hosted API."""
    monthly_gpu_cost = gpu_hourly_usd * hours_per_month
    return round(monthly_gpu_cost / hosted_price_per_1m_usd, 2)


if __name__ == "__main__":
    for q in ("fp16", "fp8", "awq", "gptq"):
        vram = estimate_weight_vram_gb(70.0, q)
        cmd = " ".join(build_vllm_serve_cmd("sarvamai/sarvam-2b-v0.5", quant=q))
        print(f"[{q.upper():4s}] 70B weights={vram:5.1f} GB | quality={QUANT_PROFILES[q].fp16_quality_retention*100:.1f}% | {cmd}")
    print(f"TCO break-even (A100 $1.80/hr vs $0.60/1M): {tco_breakeven_tokens_millions(1.80, 0.60)}M tokens/month")

