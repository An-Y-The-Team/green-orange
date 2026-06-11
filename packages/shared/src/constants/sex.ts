import { Option } from "../types/ui";

// Sex constants for voice profile and actor management
const SEX = {
  MALE: "male",
  FEMALE: "female",
} as const;

export const SEX_VALUES = Object.values(SEX);
export type Sex = (typeof SEX)[keyof typeof SEX];

// Sex options for UI components
export const SEX_OPTIONS: Option[] = [
  { value: SEX.MALE, label: "Male" },
  { value: SEX.FEMALE, label: "Female" },
];

// Sex constants for character management
const CHARACTER_SEX = {
  ...SEX,
  NON_BINARY: "non-binary",
} as const;

export const CHARACTER_SEX_VALUES = Object.values(CHARACTER_SEX);
export type CharacterSex = (typeof CHARACTER_SEX)[keyof typeof CHARACTER_SEX];

export const CHARACTER_SEX_OPTIONS: Option[] = [
  ...SEX_OPTIONS,
  { value: CHARACTER_SEX.NON_BINARY, label: "Non-binary" },
] as const;
