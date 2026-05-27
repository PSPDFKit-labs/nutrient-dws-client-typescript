/**
 * Extraction-credit usage returned by the Data Extraction API
 * (`POST /extraction/parse`).
 *
 * **Extraction credits** are a separate billing bucket from the
 * **processor API credits** consumed by `/build`, `/sign`, OCR, and
 * every other endpoint on `NutrientClient`. An extraction call never
 * debits processor credits and vice-versa.
 *
 * The server surfaces this object at
 * `ParseResponse.usage.data_extraction_credits`.
 */
export interface ExtractionCredits {
  /** Extraction credits consumed by this request. */
  cost: number;
  /** Remaining extraction credits in the account after this request. */
  remainingCredits: number;
}
