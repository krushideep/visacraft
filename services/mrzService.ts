// ICAO 9303 TD3 (passport, 2-line, 44-char) machine-readable-zone parsing and checksum validation.
// Pure functions, no I/O, no dependencies — safe to unit test in isolation.

export interface ParsedMrz {
  documentType: string;
  issuingCountry: string;
  surname: string;
  givenNames: string;
  passportNumber: string;
  passportNumberCheck: string;
  nationality: string;
  dob: string; // YYMMDD
  dobCheck: string;
  sex: string;
  expiry: string; // YYMMDD
  expiryCheck: string;
  personalNumber: string;
  personalNumberCheck: string;
  compositeCheck: string;
}

export interface MrzValidationResult {
  valid: boolean;
  expired: boolean;
  fieldResults: {
    passportNumber: boolean;
    dob: boolean;
    expiry: boolean;
    personalNumber: boolean;
    composite: boolean;
  };
  parsed: ParsedMrz;
}

const MRZ_CHAR_VALUES: Record<string, number> = {};
for (let i = 0; i < 10; i++) MRZ_CHAR_VALUES[String(i)] = i;
for (let i = 0; i < 26; i++) MRZ_CHAR_VALUES[String.fromCharCode(65 + i)] = i + 10;
MRZ_CHAR_VALUES['<'] = 0;

const WEIGHTS = [7, 3, 1];

const mrzChecksum = (value: string): number => {
  let sum = 0;
  for (let i = 0; i < value.length; i++) {
    const charValue = MRZ_CHAR_VALUES[value[i]] ?? 0;
    sum += charValue * WEIGHTS[i % 3];
  }
  return sum % 10;
};

export const computeCheckDigit = (value: string): string => String(mrzChecksum(value));

const normalizeMrzLine = (line: string) =>
  line.toUpperCase().replace(/[^A-Z0-9<]/g, '');

// Passport MRZ sits at the bottom of the photo page — scan from the end of
// the OCR'd text for two consecutive ~44-char lines matching MRZ charset.
export const extractMrzLines = (ocrText: string): { line1: string; line2: string } | null => {
  const rawLines = ocrText.split(/\r?\n/).map(normalizeMrzLine).filter((l) => l.length > 0);

  const candidates = rawLines.filter((l) => l.length >= 40 && l.length <= 46);
  for (let i = candidates.length - 1; i > 0; i--) {
    const line2 = candidates[i];
    const line1 = candidates[i - 1];
    if (line1.startsWith('P') && /^[A-Z<]/.test(line1[1] ?? '')) {
      return { line1: line1.padEnd(44, '<').slice(0, 44), line2: line2.padEnd(44, '<').slice(0, 44) };
    }
  }
  // Fall back to the last two MRZ-shaped lines even without a clean "P<" prefix match.
  if (candidates.length >= 2) {
    const line2 = candidates[candidates.length - 1];
    const line1 = candidates[candidates.length - 2];
    return { line1: line1.padEnd(44, '<').slice(0, 44), line2: line2.padEnd(44, '<').slice(0, 44) };
  }
  return null;
};

export const parseMrz = (line1: string, line2: string): ParsedMrz | null => {
  if (line1.length !== 44 || line2.length !== 44) return null;

  const documentType = line1.slice(0, 2).replace(/</g, '');
  const issuingCountry = line1.slice(2, 5).replace(/</g, '');
  const nameField = line1.slice(5, 44);
  const [surnameRaw, givenNamesRaw = ''] = nameField.split('<<');
  const surname = surnameRaw.replace(/</g, ' ').trim();
  const givenNames = givenNamesRaw.replace(/</g, ' ').trim();

  const passportNumber = line2.slice(0, 9).replace(/</g, '');
  const passportNumberCheck = line2[9];
  const nationality = line2.slice(10, 13).replace(/</g, '');
  const dob = line2.slice(13, 19);
  const dobCheck = line2[19];
  const sex = line2[20];
  const expiry = line2.slice(21, 27);
  const expiryCheck = line2[27];
  const personalNumber = line2.slice(28, 42).replace(/</g, '');
  const personalNumberCheck = line2[42];
  const compositeCheck = line2[43];

  return {
    documentType,
    issuingCountry,
    surname,
    givenNames,
    passportNumber,
    passportNumberCheck,
    nationality,
    dob,
    dobCheck,
    sex,
    expiry,
    expiryCheck,
    personalNumber,
    personalNumberCheck,
    compositeCheck,
  };
};

// Country/nationality codes are always 3 letters, no digits.
const toMrzAlpha = (s: string, length: number): string =>
  s
    .toUpperCase()
    .replace(/[^A-Z<]/g, (c) => (c === ' ' ? '<' : ''))
    .padEnd(length, '<')
    .slice(0, length);

// Passport/personal numbers can be alphanumeric.
const toMrzAlnum = (s: string, length: number): string =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9<]/g, (c) => (c === ' ' ? '<' : ''))
    .padEnd(length, '<')
    .slice(0, length);

// Reverse of parseMrz: reassembles a corrected/user-asserted set of field
// values into well-formed TD3 lines with freshly computed check digits.
// Used when a user edits the decoded fields shown after a failed/uncertain
// read — since they're asserting these are the true values, computing check
// digits from them (rather than comparing against ones the OCR guessed) is
// the correct thing to do, same concept as the existing raw two-line MRZ
// manual-entry path, just via friendlier per-field inputs.
export const encodeMrzLine1 = (fields: {
  issuingCountry: string;
  surname: string;
  givenNames: string;
}): string => {
  const country = toMrzAlpha(fields.issuingCountry, 3);
  const surname = fields.surname.toUpperCase().trim().replace(/\s+/g, '<');
  const givenNames = fields.givenNames.toUpperCase().trim().replace(/\s+/g, '<');
  const nameField = `${surname}<<${givenNames}`;
  return `P<${country}${nameField}`.padEnd(44, '<').slice(0, 44);
};

export const encodeMrzLine2 = (fields: {
  passportNumber: string;
  nationality: string;
  dob: string;
  sex: string;
  expiry: string;
  personalNumber?: string;
}): string => {
  const passportNumber = toMrzAlnum(fields.passportNumber, 9);
  const passportNumberCheck = computeCheckDigit(passportNumber);
  const nationality = toMrzAlpha(fields.nationality, 3);
  const dob = fields.dob.padStart(6, '0').slice(0, 6);
  const dobCheck = computeCheckDigit(dob);
  const sex = /^[MFX]$/i.test(fields.sex) ? fields.sex.toUpperCase() : '<';
  const expiry = fields.expiry.padStart(6, '0').slice(0, 6);
  const expiryCheck = computeCheckDigit(expiry);
  const personalNumber = toMrzAlnum(fields.personalNumber ?? '', 14);
  const personalNumberCheck = computeCheckDigit(personalNumber);

  const compositeInput =
    passportNumber + passportNumberCheck + dob + dobCheck + expiry + expiryCheck + personalNumber + personalNumberCheck;
  const compositeCheck = computeCheckDigit(compositeInput);

  return (
    passportNumber +
    passportNumberCheck +
    nationality +
    dob +
    dobCheck +
    sex +
    expiry +
    expiryCheck +
    personalNumber +
    personalNumberCheck +
    compositeCheck
  );
};

const yymmddToDate = (yymmdd: string): Date | null => {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = parseInt(yymmdd.slice(2, 4), 10);
  const dd = parseInt(yymmdd.slice(4, 6), 10);
  // Expiry dates are always in the future relative to issuance; passports are valid
  // ~10y max, so treat 00-79 as 2000s and 80-99 as 1900s (standard MRZ convention).
  const year = yy <= 79 ? 2000 + yy : 1900 + yy;
  const date = new Date(Date.UTC(year, mm - 1, dd));
  if (date.getUTCMonth() !== mm - 1) return null;
  return date;
};

export const validateMrzChecksums = (parsed: ParsedMrz): MrzValidationResult => {
  const passportNumberValid =
    String(mrzChecksum(parsed.passportNumber.padEnd(9, '<'))) === parsed.passportNumberCheck ||
    parsed.passportNumberCheck === '<';
  const dobValid = String(mrzChecksum(parsed.dob)) === parsed.dobCheck;
  const expiryValid = String(mrzChecksum(parsed.expiry)) === parsed.expiryCheck;
  const personalNumberValid =
    parsed.personalNumber.length === 0 ||
    String(mrzChecksum(parsed.personalNumber.padEnd(14, '<'))) === parsed.personalNumberCheck ||
    parsed.personalNumberCheck === '<';

  const compositeInput =
    parsed.passportNumber.padEnd(9, '<') +
    parsed.passportNumberCheck +
    parsed.dob +
    parsed.dobCheck +
    parsed.expiry +
    parsed.expiryCheck +
    parsed.personalNumber.padEnd(14, '<') +
    parsed.personalNumberCheck;
  const compositeValid = String(mrzChecksum(compositeInput)) === parsed.compositeCheck;

  const expiryDate = yymmddToDate(parsed.expiry);
  const expired = expiryDate ? expiryDate.getTime() < Date.now() : false;

  return {
    valid: passportNumberValid && dobValid && expiryValid && personalNumberValid && compositeValid,
    expired,
    fieldResults: {
      passportNumber: passportNumberValid,
      dob: dobValid,
      expiry: expiryValid,
      personalNumber: personalNumberValid,
      composite: compositeValid,
    },
    parsed,
  };
};
