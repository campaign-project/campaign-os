/**
 * Per-state voter-file adapter specs — the 7 free-access states (NC/OH/MS/FL/OK/VT/WA).
 *
 * Each spec is the cited, real record layout from that state's official data
 * dictionary (pulled 2026-06-07; see layoutDocUrl + the citations in the research
 * run). The loader (load.ts) is generic; ALL state-specific knowledge lives here.
 * Adding the other 44 states is purely more entries in this table.
 *
 * Status vocabularies differ per state; only the ACTIVE set counts toward a valid
 * signature. Anything not active → inactive/cancelled (and cancelled voters are
 * INVALID signers, per rules.ts).
 */

import type { AdapterSpec } from "./load.ts";

export const ADAPTERS: Record<string, AdapterSpec> = {
  "North Carolina": {
    jurisdiction: "North Carolina",
    delimiter: "\t",
    encoding: "windows-1252",
    hasHeader: true,
    dateFormat: "MM/DD/YYYY",
    statusActive: ["A", "ACTIVE"],
    statusCancelled: ["R", "D"], // R=REMOVED, D=DENIED (I=INACTIVE, S=TEMPORARY → inactive)
    columns: {
      voterId: "ncid", // statewide-stable id (voter_reg_num is county-scoped)
      firstName: "first_name", middleName: "middle_name", lastName: "last_name", suffix: "name_suffix_lbl",
      streetAddress: "res_street_address", city: "res_city_desc", state: "state_cd", zip: "zip_code",
      status: "status_cd", registrationDate: "registr_dt", county: "county_desc", district: "nc_house_abbrv",
      tileCell: "precinct_abbrv", // NC's compact turf geography — the index tile (build-tiles.mts)
    },
    downloadUrl: "https://s3.amazonaws.com/dl.ncsbe.gov/data/ncvoter_Statewide.zip",
    layoutDocUrl: "https://s3.amazonaws.com/dl.ncsbe.gov/data/layout_ncvoter.txt",
    confidence: "high",
    verifiedAsOf: "2026-06-07",
    layoutRevision: "2026-02-02",
    notes: "Layout read verbatim (updated 02/02/2026). Tab-delimited; ncid is the statewide join key. Encoding win-1252 is NC convention (not stated in layout). status_cd: A=active; I/R/D/S non-active.",
  },

  Ohio: {
    jurisdiction: "Ohio",
    delimiter: ",",
    encoding: "utf-8",
    hasHeader: true,
    dateFormat: "MM/DD/YYYY",
    statusActive: ["ACTIVE"],
    statusCancelled: ["CANCELLED"],
    columns: {
      voterId: "SOS_VOTERID",
      firstName: "FIRST_NAME", middleName: "MIDDLE_NAME", lastName: "LAST_NAME", suffix: "SUFFIX",
      streetAddress: "RESIDENTIAL_ADDRESS1", unit: "RESIDENTIAL_SECONDARY_ADDR",
      city: "RESIDENTIAL_CITY", state: "RESIDENTIAL_STATE", zip: "RESIDENTIAL_ZIP",
      status: "VOTER_STATUS", registrationDate: "REGISTRATION_DATE",
      county: "COUNTY_NUMBER", district: "CONGRESSIONAL_DISTRICT",
      tileCell: "PRECINCT_CODE", // OH's compact turf geography (county-qualified by build-tiles) — precinct tiles, like NC
    },
    downloadUrl: "https://www6.ohiosos.gov/ords/f?p=VOTERFTP:HOME",
    layoutDocUrl: "https://www6.ohiosos.gov/ords/f?p=111:2::FILE_LAYOUT:NO:RP,2::",
    confidence: "medium",
    verifiedAsOf: "2026-06-07",
    notes: "County is a numeric code (COUNTY_NUMBER), not a name. tileCell=PRECINCT_CODE gives precinct tiling (county-qualified, like NC). OH publishes per-county CSVs; concatenate to ONE statewide file keeping a SINGLE header row (head -1 first.csv > ohio.csv; for f in *.csv; do tail -n +2 \"$f\" >> ohio.csv; done) — extra header rows would parse as junk voter records. Confirm PRECINCT_CODE/RESIDENTIAL_* headers against the real file on first build.",
  },

  Mississippi: {
    jurisdiction: "Mississippi",
    delimiter: ",",
    encoding: "utf-8",
    hasHeader: true,
    dateFormat: "unknown", // registration date present; format not documented in the distribution-program PDF
    statusActive: ["active"],
    statusCancelled: ["purged", "canceled", "cancelled"],
    columns: {
      voterId: "Mapping Value",
      firstName: "First Name", middleName: "Middle Name", lastName: "Last Name", suffix: "Suffix",
      streetAddress: "Residential Address", houseNumber: "House Number", streetName: "Street Name",
      city: "Residence City", state: "Residence State", zip: "Residential Zip Code",
      status: "Voter Status", registrationDate: "Effective Voter Registration Date", county: "Residential County",
    },
    downloadUrl: "https://app.smartsheet.com/b/form/5c8b666a679c4c148eb513c8981a4962",
    layoutDocUrl: "https://www.sos.ms.gov/sites/default/files/elections/2025%20Voter%20File%20Weekly%20Distribution%20Program.pdf",
    confidence: "low",
    verifiedAsOf: "2026-06-07",
    notes: "⚠ The exact last-name column header is UNCONFIRMED (the distribution-program PDF lists First/Middle/Suffix but not Last verbatim); 'Last Name' is a best-guess to confirm against the real file header. Date format also undocumented (set to unknown → registeredOn left blank until confirmed).",
  },

  Florida: {
    jurisdiction: "Florida",
    delimiter: "\t",
    encoding: "ascii",
    hasHeader: false, // POSITIONAL — a header-name adapter would silently misread this file
    dateFormat: "MM/DD/YYYY",
    statusActive: ["ACT"],
    statusCancelled: [], // FL extract carries ACT/INA; removed voters are excluded from the file
    columns: {
      county: 1, voterId: 2, lastName: 3, suffix: 4, firstName: 5, middleName: 6,
      streetAddress: [8, 9], // Residence Address Line 1 + Line 2
      city: 10, state: 11, zip: 12,
      registrationDate: 23, status: 29, district: 30,
    },
    downloadUrl: "https://dos.fl.gov/elections/data-statistics/voter-registration-statistics/voter-extract-request/",
    layoutDocUrl: "https://dos.fl.gov/media/710644/final-voter-extract-disk-file-layout-rev-20260504.pdf",
    confidence: "high",
    verifiedAsOf: "2026-06-07",
    layoutRevision: "2026-05-04",
    notes: "Header-LESS, tab-delimited, fixed COLUMN ORDER (1-based positions, layout rev 2026-05-04). Distributed per-county as CountyCode_YYYYMMDD.txt inside a monthly zip; by request only.",
  },

  Oklahoma: {
    jurisdiction: "Oklahoma",
    delimiter: ",",
    encoding: "utf-8",
    hasHeader: true,
    dateFormat: "MM/DD/YYYY",
    statusActive: ["A"],
    statusCancelled: [],
    columns: {
      voterId: "VoterID",
      firstName: "FirstName", middleName: "MiddleName", lastName: "LastName", suffix: "Suffix",
      houseNumber: "StreetNum", streetName: "StreetName", unit: "BldgNum",
      city: "City", zip: "Zip", // no separate state column (file is all-OK)
      status: "Status", registrationDate: "RegistrationDate", county: "County_Desc", district: "Precinct",
    },
    downloadUrl: "https://data.okelections.gov/",
    layoutDocUrl: "https://oklahoma.gov/content/dam/ok/en/elections/ok-election-data-warehouse/readme-vrlist.pdf",
    confidence: "high",
    verifiedAsOf: "2026-06-07",
    notes: "Free but behind an approved EDW full-access account. No state column (all records are OK). district mapped to Precinct.",
  },

  Vermont: {
    jurisdiction: "Vermont",
    delimiter: "|",
    encoding: "windows-1252",
    hasHeader: true,
    dateFormat: "MM/DD/YYYY",
    statusActive: ["ACTIVE"],
    statusCancelled: ["PURGED", "CANCELED"],
    columns: {
      voterId: "Voter ID",
      firstName: "First Name", middleName: "Middle Initial", lastName: "Last Name", suffix: "Suffix",
      streetAddress: "Legal Address Line 1", unit: "Legal Address Line 2",
      city: "Legal Address City", state: "Legal Address State", zip: "Legal Address Zip",
      status: "Status", registrationDate: "Date of Registration", county: "County", district: "Voting District",
    },
    downloadUrl: "https://outside.vermont.gov/dept/sos/Elections_Division/voters/faq/request_electronic_copy_vermont_statewide_checklist.pdf",
    layoutDocUrl: "https://www.sec.state.vt.us/elections/voters/statewide-checklist.aspx",
    confidence: "medium",
    verifiedAsOf: "2026-06-07",
    notes: "Pipe-delimited. PURGED/CANCELED are excluded from the report entirely; CHALLENGED → inactive. Free by signed affidavit.",
  },

  Washington: {
    jurisdiction: "Washington",
    delimiter: "|",
    encoding: "windows-1252",
    hasHeader: true,
    dateFormat: "YYYY-MM-DD",
    statusActive: ["Active"],
    statusCancelled: [],
    columns: {
      voterId: "StateVoterID",
      firstName: "FName", middleName: "MName", lastName: "LName", suffix: "NameSuffix",
      houseNumber: "RegStNum", streetName: "RegStName", unit: "RegUnitNum",
      city: "RegCity", state: "RegState", zip: "RegZipCode",
      status: "StatusCode", registrationDate: "Registrationdate", county: "CountyCode", district: "LegislativeDistrict",
    },
    downloadUrl: "https://www.sos.wa.gov/washington-voter-registration-database-extract",
    layoutDocUrl: "https://www.sos.wa.gov/_assets/elections/vrdb-database-fields.pdf",
    confidence: "high",
    verifiedAsOf: "2026-06-07",
    notes: "Pipe-delimited, ISO dates (YYYY-MM-DD). 'Primary Only Voter' → inactive for petition purposes. Free via emailed download link.",
  },
};
