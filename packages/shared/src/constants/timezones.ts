import { Option } from "../types/ui";

// Comprehensive timezone list with search-friendly labels
// Includes common city names, country names, and timezone abbreviations
// Note: Daylight Savings Time is automatically handled by the browser's Intl.DateTimeFormat API
export const TIMEZONES = [
  // Oceania
  {
    value: "Pacific/Kiritimati",
    label: "Kiritimati, Kiribati",
    offset: "+14:00",
    searchTerms: [
      "kiritimati",
      "kiribati",
      "christmas island",
      "line islands",
      "oceania",
    ],
  },
  {
    value: "Pacific/Tongatapu",
    label: "Tonga",
    offset: "+13:00",
    searchTerms: ["tonga", "nuku'alofa", "oceania"],
  },
  {
    value: "Pacific/Apia",
    label: "Samoa",
    offset: "+13:00",
    searchTerms: ["samoa", "apia", "oceania"],
  },
  {
    value: "Pacific/Auckland",
    label: "Auckland, New Zealand",
    offset: "+12:00",
    searchTerms: [
      "auckland",
      "new zealand",
      "NZ",
      "NZST",
      "NZDT",
      "oceania",
      "wellington",
    ],
  },
  {
    value: "Pacific/Fiji",
    label: "Fiji",
    offset: "+12:00",
    searchTerms: ["fiji", "oceania"],
  },
  {
    value: "Pacific/Noumea",
    label: "New Caledonia",
    offset: "+11:00",
    searchTerms: ["new caledonia", "noumea", "oceania"],
  },
  {
    value: "Pacific/Guadalcanal",
    label: "Solomon Islands",
    offset: "+11:00",
    searchTerms: ["solomon islands", "guadalcanal", "honiara", "oceania"],
  },
  {
    value: "Australia/Sydney",
    label: "Sydney, Australia",
    offset: "+10:00",
    searchTerms: [
      "sydney",
      "australia",
      "NSW",
      "AEST",
      "AEDT",
      "oceania",
      "new south wales",
    ],
  },
  {
    value: "Australia/Melbourne",
    label: "Melbourne, Australia",
    offset: "+10:00",
    searchTerms: ["melbourne", "australia", "victoria", "oceania"],
  },
  {
    value: "Australia/Brisbane",
    label: "Brisbane, Australia",
    offset: "+10:00",
    searchTerms: ["brisbane", "australia", "queensland", "oceania"],
  },

  // Asia
  {
    value: "Australia/Adelaide",
    label: "Adelaide, Australia",
    offset: "+09:30",
    searchTerms: ["adelaide", "australia", "south australia", "oceania"],
  },
  {
    value: "Asia/Tokyo",
    label: "Tokyo, Japan",
    offset: "+09:00",
    searchTerms: [
      "tokyo",
      "japan",
      "JST",
      "japanese",
      "asia",
      "osaka",
      "kyoto",
    ],
  },
  {
    value: "Asia/Seoul",
    label: "Seoul, South Korea",
    offset: "+09:00",
    searchTerms: ["seoul", "south korea", "korea", "KST", "asia", "busan"],
  },
  {
    value: "Asia/Shanghai",
    label: "China (Beijing, Shanghai)",
    offset: "+08:00",
    searchTerms: [
      "china",
      "beijing",
      "shanghai",
      "CST",
      "chinese",
      "asia",
      "shenzhen",
      "guangzhou",
    ],
  },
  {
    value: "Asia/Taipei",
    label: "Taipei, Taiwan",
    offset: "+08:00",
    searchTerms: ["taipei", "taiwan", "formosa", "asia"],
  },
  {
    value: "Asia/Singapore",
    label: "Singapore",
    offset: "+08:00",
    searchTerms: ["singapore", "SGT", "asia"],
  },
  {
    value: "Asia/Kuala_Lumpur",
    label: "Kuala Lumpur, Malaysia",
    offset: "+08:00",
    searchTerms: ["kuala lumpur", "malaysia", "KL", "asia"],
  },
  {
    value: "Asia/Manila",
    label: "Manila, Philippines",
    offset: "+08:00",
    searchTerms: ["manila", "philippines", "asia", "filipino"],
  },
  {
    value: "Asia/Hong_Kong",
    label: "Hong Kong",
    offset: "+08:00",
    searchTerms: ["hong kong", "HK", "HKT", "asia"],
  },
  {
    value: "Australia/Perth",
    label: "Perth, Australia",
    offset: "+08:00",
    searchTerms: ["perth", "australia", "western australia", "AWST", "oceania"],
  },
  {
    value: "Asia/Bangkok",
    label: "Bangkok, Thailand",
    offset: "+07:00",
    searchTerms: ["bangkok", "thailand", "siam", "asia"],
  },
  {
    value: "Asia/Ho_Chi_Minh",
    label: "Ho Chi Minh City, Vietnam",
    offset: "+07:00",
    searchTerms: ["ho chi minh", "vietnam", "hanoi", "asia", "viet nam"],
  },
  {
    value: "Asia/Jakarta",
    label: "Jakarta, Indonesia",
    offset: "+07:00",
    searchTerms: ["jakarta", "indonesia", "asia", "bali"],
  },
  {
    value: "Asia/Yangon",
    label: "Yangon, Myanmar",
    offset: "+06:30",
    searchTerms: ["yangon", "myanmar", "burma", "asia", "rangoon"],
  },
  {
    value: "Asia/Dhaka",
    label: "Dhaka, Bangladesh",
    offset: "+06:00",
    searchTerms: ["dhaka", "bangladesh", "asia"],
  },
  {
    value: "Asia/Kolkata",
    label: "India (IST)",
    offset: "+05:30",
    searchTerms: [
      "india",
      "kolkata",
      "mumbai",
      "delhi",
      "bangalore",
      "IST",
      "indian standard time",
      "asia",
      "new delhi",
      "chennai",
      "hyderabad",
    ],
  },
  {
    value: "Asia/Karachi",
    label: "Karachi, Pakistan",
    offset: "+05:00",
    searchTerms: ["karachi", "pakistan", "PKT", "asia", "islamabad"],
  },
  {
    value: "Asia/Tehran",
    label: "Tehran, Iran",
    offset: "+03:30",
    searchTerms: ["tehran", "iran", "persia", "asia"],
  },
  {
    value: "Asia/Dubai",
    label: "Dubai, UAE",
    offset: "+04:00",
    searchTerms: [
      "dubai",
      "UAE",
      "united arab emirates",
      "GST",
      "asia",
      "abu dhabi",
    ],
  },
  {
    value: "Africa/Nairobi",
    label: "Nairobi, Kenya",
    offset: "+03:00",
    searchTerms: ["nairobi", "kenya", "africa"],
  },
  {
    value: "Europe/Istanbul",
    label: "Istanbul, Turkey",
    offset: "+03:00",
    searchTerms: ["istanbul", "turkey", "turkiye", "europe", "ankara"],
  },
  {
    value: "Europe/Moscow",
    label: "Moscow, Russia",
    offset: "+03:00",
    searchTerms: ["moscow", "russia", "moskva", "europe"],
  },
  {
    value: "Asia/Riyadh",
    label: "Riyadh, Saudi Arabia",
    offset: "+03:00",
    searchTerms: ["riyadh", "saudi arabia", "KSA", "asia"],
  },

  // Africa
  {
    value: "Europe/Athens",
    label: "Athens, Greece",
    offset: "+02:00",
    searchTerms: ["athens", "greece", "hellas", "europe"],
  },
  {
    value: "Europe/Helsinki",
    label: "Helsinki, Finland",
    offset: "+02:00",
    searchTerms: ["helsinki", "finland", "suomi", "europe"],
  },
  {
    value: "Europe/Bucharest",
    label: "Bucharest, Romania",
    offset: "+02:00",
    searchTerms: ["bucharest", "romania", "europe"],
  },
  {
    value: "Europe/Kiev",
    label: "Kyiv, Ukraine",
    offset: "+02:00",
    searchTerms: ["kyiv", "kiev", "ukraine", "europe"],
  },
  {
    value: "Africa/Cairo",
    label: "Cairo, Egypt",
    offset: "+02:00",
    searchTerms: ["cairo", "egypt", "africa"],
  },
  {
    value: "Africa/Johannesburg",
    label: "Johannesburg, South Africa",
    offset: "+02:00",
    searchTerms: ["johannesburg", "south africa", "cape town", "africa"],
  },

  // Europe
  {
    value: "Europe/Paris",
    label: "Paris, France (Central European)",
    offset: "+01:00",
    searchTerms: ["paris", "france", "CET", "CEST", "europe"],
  },
  {
    value: "Europe/Berlin",
    label: "Berlin, Germany",
    offset: "+01:00",
    searchTerms: ["berlin", "germany", "deutschland", "europe"],
  },
  {
    value: "Europe/Madrid",
    label: "Madrid, Spain",
    offset: "+01:00",
    searchTerms: ["madrid", "spain", "espana", "europe", "barcelona"],
  },
  {
    value: "Europe/Rome",
    label: "Rome, Italy",
    offset: "+01:00",
    searchTerms: ["rome", "italy", "italia", "europe", "milan", "milano"],
  },
  {
    value: "Europe/Amsterdam",
    label: "Amsterdam, Netherlands",
    offset: "+01:00",
    searchTerms: ["amsterdam", "netherlands", "holland", "europe"],
  },
  {
    value: "Europe/Brussels",
    label: "Brussels, Belgium",
    offset: "+01:00",
    searchTerms: ["brussels", "belgium", "europe"],
  },
  {
    value: "Europe/Zurich",
    label: "Zurich, Switzerland",
    offset: "+01:00",
    searchTerms: ["zurich", "switzerland", "swiss", "europe", "geneva"],
  },
  {
    value: "Europe/Stockholm",
    label: "Stockholm, Sweden",
    offset: "+01:00",
    searchTerms: ["stockholm", "sweden", "sverige", "europe"],
  },
  {
    value: "Europe/Oslo",
    label: "Oslo, Norway",
    offset: "+01:00",
    searchTerms: ["oslo", "norway", "norge", "europe"],
  },
  {
    value: "Europe/Copenhagen",
    label: "Copenhagen, Denmark",
    offset: "+01:00",
    searchTerms: ["copenhagen", "denmark", "danmark", "europe"],
  },
  {
    value: "Europe/Warsaw",
    label: "Warsaw, Poland",
    offset: "+01:00",
    searchTerms: ["warsaw", "poland", "polska", "europe"],
  },
  {
    value: "Europe/Prague",
    label: "Prague, Czech Republic",
    offset: "+01:00",
    searchTerms: ["prague", "czech", "czechia", "europe"],
  },
  {
    value: "Europe/Vienna",
    label: "Vienna, Austria",
    offset: "+01:00",
    searchTerms: ["vienna", "austria", "österreich", "europe"],
  },
  {
    value: "Europe/Budapest",
    label: "Budapest, Hungary",
    offset: "+01:00",
    searchTerms: ["budapest", "hungary", "magyarország", "europe"],
  },
  {
    value: "Africa/Lagos",
    label: "Lagos, Nigeria",
    offset: "+01:00",
    searchTerms: ["lagos", "nigeria", "africa", "abuja"],
  },
  {
    value: "Africa/Casablanca",
    label: "Casablanca, Morocco",
    offset: "+01:00",
    searchTerms: ["casablanca", "morocco", "maroc", "africa"],
  },

  // UTC
  {
    value: "Europe/London",
    label: "London, UK (British Time)",
    offset: "+00:00",
    searchTerms: [
      "london",
      "UK",
      "united kingdom",
      "britain",
      "england",
      "GMT",
      "BST",
      "europe",
    ],
  },
  {
    value: "Europe/Dublin",
    label: "Dublin, Ireland",
    offset: "+00:00",
    searchTerms: ["dublin", "ireland", "europe"],
  },
  {
    value: "UTC",
    label: "UTC (Coordinated Universal Time)",
    offset: "+00:00",
    searchTerms: ["UTC", "GMT", "coordinated universal time"],
  },

  // Atlantic (-01:00, -02:00)
  {
    value: "Atlantic/Azores",
    label: "Azores, Portugal",
    offset: "-01:00",
    searchTerms: ["azores", "portugal", "atlantic", "ponta delgada"],
  },
  {
    value: "Atlantic/Cape_Verde",
    label: "Cape Verde",
    offset: "-01:00",
    searchTerms: ["cape verde", "praia", "atlantic"],
  },
  {
    value: "Atlantic/South_Georgia",
    label: "South Georgia",
    offset: "-02:00",
    searchTerms: ["south georgia", "south sandwich islands", "atlantic"],
  },

  // Americas
  {
    value: "America/Sao_Paulo",
    label: "São Paulo, Brazil",
    offset: "-03:00",
    searchTerms: ["sao paulo", "brazil", "brasil", "brt", "america"],
  },
  {
    value: "America/Buenos_Aires",
    label: "Buenos Aires, Argentina",
    offset: "-03:00",
    searchTerms: ["buenos aires", "argentina", "america"],
  },
  {
    value: "America/Santiago",
    label: "Santiago, Chile",
    offset: "-03:00",
    searchTerms: ["santiago", "chile", "america"],
  },
  {
    value: "America/Port_of_Spain",
    label: "Port of Spain, Trinidad and Tobago",
    offset: "-04:00",
    searchTerms: [
      "port of spain",
      "trinidad",
      "tobago",
      "trinidad and tobago",
      "AST",
      "atlantic standard time",
      "caribbean",
      "america",
    ],
  },
  {
    value: "America/New_York",
    label: "New York, USA (Eastern Time)",
    offset: "-05:00",
    searchTerms: [
      "new york",
      "NYC",
      "eastern",
      "ET",
      "EST",
      "EDT",
      "USA",
      "united states",
      "america",
    ],
  },
  {
    value: "America/Toronto",
    label: "Toronto, Canada",
    offset: "-05:00",
    searchTerms: ["toronto", "canada", "ontario", "america"],
  },
  {
    value: "America/Lima",
    label: "Lima, Peru",
    offset: "-05:00",
    searchTerms: ["lima", "peru", "america"],
  },
  {
    value: "America/Bogota",
    label: "Bogotá, Colombia",
    offset: "-05:00",
    searchTerms: ["bogota", "colombia", "america"],
  },
  {
    value: "America/Detroit",
    label: "Eastern Standard Time",
    offset: "-05:00",
    searchTerms: [
      "eastern time",
      "EST",
      "detroit",
      "havana",
      "indiana",
      "iqaluit",
      "kentucky",
      "louisville",
      "montreal",
      "nassau",
      "new york",
      "nipigon",
      "pangnirtung",
      "port-au-prince",
      "thunder bay",
      "toronto",
      "UTC-5",
    ],
  },
  {
    value: "America/Chicago",
    label: "Chicago, USA (Central Time)",
    offset: "-06:00",
    searchTerms: [
      "chicago",
      "central",
      "CT",
      "CST",
      "CDT",
      "USA",
      "united states",
      "america",
    ],
  },
  {
    value: "America/Mexico_City",
    label: "Mexico City, Mexico",
    offset: "-06:00",
    searchTerms: ["mexico city", "mexico", "CDMX", "america"],
  },
  {
    value: "America/Belize",
    label: "Central America",
    offset: "-06:00",
    searchTerms: [
      "central america",
      "cast",
      "belize",
      "costa rica",
      "el salvador",
      "guatemala",
      "managua",
      "tegucigalpa",
      "galapagos",
      "UTC-6",
    ],
  },
  {
    value: "America/Bahia_Banderas",
    label: "Guadalajara, Mexico City, Monterrey",
    offset: "-06:00",
    searchTerms: [
      "guadalajara",
      "mexico city",
      "monterrey",
      "CDT",
      "bahia banderas",
      "cancun",
      "merida",
      "UTC-6",
    ],
  },
  {
    value: "America/Regina",
    label: "Saskatchewan",
    offset: "-06:00",
    searchTerms: [
      "saskatchewan",
      "ccst",
      "regina",
      "swift current",
      "canada",
      "UTC-6",
    ],
  },
  {
    value: "America/Denver",
    label: "Denver, USA (Mountain Time)",
    offset: "-07:00",
    searchTerms: [
      "denver",
      "mountain",
      "MT",
      "MST",
      "MDT",
      "USA",
      "united states",
      "america",
      "colorado",
    ],
  },
  {
    value: "America/Phoenix",
    label: "Phoenix, USA (Arizona)",
    offset: "-07:00",
    searchTerms: [
      "phoenix",
      "arizona",
      "az",
      "USA",
      "united states",
      "america",
    ],
  },
  {
    value: "America/Chihuahua",
    label: "Chihuahua, La Paz, Mazatlan",
    offset: "-07:00",
    searchTerms: ["chihuahua", "la paz", "mazatlan", "MDT", "mexico", "UTC-7"],
  },
  {
    value: "America/Boise",
    label: "Mountain Time (US & Canada)",
    offset: "-07:00",
    searchTerms: [
      "mountain time",
      "MDT",
      "boise",
      "cambridge bay",
      "denver",
      "edmonton",
      "inuvik",
      "ojinaga",
      "yellowknife",
      "UTC-7",
    ],
  },
  {
    value: "America/Los_Angeles",
    label: "Los Angeles, USA (Pacific Time)",
    offset: "-08:00",
    searchTerms: [
      "los angeles",
      "LA",
      "pacific",
      "PT",
      "PST",
      "PDT",
      "california",
      "USA",
      "united states",
      "america",
      "san francisco",
      "seattle",
    ],
  },
  {
    value: "America/Vancouver",
    label: "Vancouver, Canada",
    offset: "-08:00",
    searchTerms: ["vancouver", "canada", "british columbia", "BC", "america"],
  },
  {
    value: "America/Santa_Isabel",
    label: "Baja California",
    offset: "-08:00",
    searchTerms: ["baja california", "PDT", "mexico", "tijuana", "UTC-8"],
  },
  {
    value: "America/Anchorage",
    label: "Anchorage, USA (Alaska)",
    offset: "-09:00",
    searchTerms: [
      "anchorage",
      "alaska",
      "AK",
      "USA",
      "united states",
      "america",
    ],
  },
  {
    value: "Pacific/Honolulu",
    label: "Honolulu, USA (Hawaii)",
    offset: "-10:00",
    searchTerms: ["honolulu", "hawaii", "USA", "united states", "america"],
  },

  // UTC
  {
    value: "Pacific/Midway",
    label: "Coordinated Universal Time-11",
    offset: "-11:00",
    searchTerms: [
      "coordinated universal time-11",
      "UTC-11",
      "pacific",
      "midway",
      "niue",
      "pago pago",
    ],
  },
  {
    value: "Etc/GMT+12",
    label: "International Date Line West",
    offset: "-12:00",
    searchTerms: [
      "international date line west",
      "dateline",
      "idl",
      "UTC-12",
      "etc/GMT+12",
    ],
  },
];

function timezonesLabelWithOffsets(
  timezone: (typeof TIMEZONES)[number]
): string {
  return `${timezone.label} (UTC${timezone.offset})`;
}

function toTitleCaseWithSpaces(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.substring(1))
    .join(" ");
}

// Helper function to search timezones (case-insensitive)
export function searchTimezones(query: string): typeof TIMEZONES {
  if (!query) return TIMEZONES;

  const lowercaseQuery = query.toLowerCase().trim();

  return TIMEZONES.filter((tz) => {
    // Check main label
    if (tz.label.toLowerCase().includes(lowercaseQuery)) return true;

    // Check option label with offsets (e.g., "Asia/Ho_Chi_Minh (UTC+07:00)")
    if (timezonesLabelWithOffsets(tz).toLowerCase().includes(lowercaseQuery))
      return true;

    // Check timezone value (e.g., "Asia/Ho_Chi_Minh")
    if (tz.value.toLowerCase().includes(lowercaseQuery)) return true;

    // Check offset value
    if (tz.offset.toLowerCase().includes(lowercaseQuery)) return true;

    // Check search terms
    return tz.searchTerms.some((term) =>
      term.toLowerCase().includes(lowercaseQuery)
    );
  });
}

// Convert TIMEZONES to MultiSelect options format
export const TIMEZONE_OPTIONS: Option[] = TIMEZONES.map((timezone) => ({
  value: timezone.value,
  label: timezonesLabelWithOffsets(timezone),
  description: `${timezone.searchTerms.map((term) => toTitleCaseWithSpaces(term)).join(", ")}`,
}));

// Search timezone options for MultiSelect with offset included in the label
export const searchTimezoneOptions = (
  query: string,
  _options: Option[]
): Option[] => {
  return searchTimezones(query).map((tz) => ({
    value: tz.value,
    label: timezonesLabelWithOffsets(tz),
    description: `${tz.searchTerms.map((term) => toTitleCaseWithSpaces(term)).join(", ")}`,
  }));
};
