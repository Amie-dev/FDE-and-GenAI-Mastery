import { Request, Response } from 'express';
import { decodeReport, frameReport, torture, type FragmentMode } from '../services/codec.service.js';

/**
 * Chapter 04 — the codec endpoints.
 *
 * There is no model call here. This is the CLIENT half of the pipeline, exposed
 * over HTTP so the experiments in the notes are runnable: split a real multi-byte
 * payload at byte level and watch one decoder survive it and the other not.
 */

/** Chapter 04 §04.4 — naive vs streaming decode, over the same bytes. */
export const postDecode = (req: Request, res: Response): void => {
  const { text, chunkSize } = req.body as { text: string; chunkSize: FragmentMode };

  res.status(200).json({
    success: true,
    data: {
      ...decodeReport(text, chunkSize),
      note: 'Chapter 04 §04.4 — a per-chunk TextDecoder cannot hold an incomplete multi-byte sequence.',
    },
  });
};

/** Chapter 04 §04.3/§04.5 — frame reassembly with and without a leftover buffer. */
export const postFrames = (req: Request, res: Response): void => {
  const { text, chunkSize } = req.body as { text: string; chunkSize: FragmentMode };

  res.status(200).json({
    success: true,
    data: {
      ...frameReport(text, chunkSize),
      note: 'Chapter 04 §04.3 — accumulate before splitting, and retain the tail; the naive parser drops it.',
    },
  });
};

/** Chapter 04 §04.6 / chapter 09 §09.10 — the fragmentation torture test. */
export const postTorture = (req: Request, res: Response): void => {
  const { text, seed } = req.body as { text: string; seed: number };
  const report = torture(text, seed);

  res.status(report.ok ? 200 : 500).json({
    success: report.ok,
    data: {
      ...report,
      note: 'Chapter 04 §04.6 — if the accumulated text changes with the fragment size, the client has a bug.',
    },
  });
};
