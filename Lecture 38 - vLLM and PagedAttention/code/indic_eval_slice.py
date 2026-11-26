"""Indic evaluation slice & tokenizer fertility benchmark (Chapter 09 · S21)."""

from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class IndicSample:
    sample_id: str
    language: str
    prompt: str
    expected_keywords: List[str]
    english_bpe_tokens: int
    indic_tokenizer_tokens: int


INDIC_EVAL_SLICE: List[IndicSample] = [
    IndicSample(
        sample_id="hi-01",
        language="Hindi",
        prompt="मेरा पासवर्ड रीसेट कैसे करें?",
        expected_keywords=["पासवर्ड", "रीसेट"],
        english_bpe_tokens=29,
        indic_tokenizer_tokens=8,
    ),
    IndicSample(
        sample_id="ta-01",
        language="Tamil",
        prompt="என் கணக்கு கடவுச்சொல்லை எவ்வாறு மாற்றுவது?",
        expected_keywords=["கடவுச்சொல்", "மாற்று"],
        english_bpe_tokens=42,
        indic_tokenizer_tokens=10,
    ),
    IndicSample(
        sample_id="te-01",
        language="Telugu",
        prompt="నా ఖాతా పాస్‌వర్డ్ ఎలా మార్చాలి?",
        expected_keywords=["పాస్‌వర్డ్", "మార్చాలి"],
        english_bpe_tokens=36,
        indic_tokenizer_tokens=9,
    ),
    IndicSample(
        sample_id="hinglish-01",
        language="Hinglish",
        prompt="Mera order #402 abhi tak deliver nahi hua, refund status kya hai?",
        expected_keywords=["order", "refund"],
        english_bpe_tokens=21,
        indic_tokenizer_tokens=13,
    ),
]


def evaluate_indic_slice(
    model_name: str,
    quant: str,
    fp16_accuracy: float,
    quant_accuracy: float,
) -> Dict[str, object]:
    """Verify Indic tokenizer efficiency and <= 2% accuracy drop vs FP16."""
    total_en_bpe = sum(s.english_bpe_tokens for s in INDIC_EVAL_SLICE)
    total_indic = sum(s.indic_tokenizer_tokens for s in INDIC_EVAL_SLICE)
    token_reduction_pct = round(((total_en_bpe - total_indic) / total_en_bpe) * 100.0, 2)
    quality_delta_pct = round((fp16_accuracy - quant_accuracy) * 100.0, 2)

    return {
        "model": model_name,
        "quantization": quant,
        "samples": len(INDIC_EVAL_SLICE),
        "english_bpe_tokens": total_en_bpe,
        "indic_tokenizer_tokens": total_indic,
        "token_reduction_pct": token_reduction_pct,
        "quality_delta_pct": quality_delta_pct,
        "within_2pct_gate": quality_delta_pct <= 2.0,
    }


if __name__ == "__main__":
    report = evaluate_indic_slice(
        model_name="sarvamai/sarvam-1 (AWQ)",
        quant="awq",
        fp16_accuracy=0.880,
        quant_accuracy=0.871,
    )
    print("INDIC_EVAL_REPORT:", report)

