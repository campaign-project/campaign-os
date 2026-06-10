/* ============================================================
   Synthetic voter sample for the Gather live-capture demo.
   FABRICATED — no real voter PII (same rule as the whole project:
   map/parse the files, never ship the people). Inlined as a global
   so the engine works on file:// without a fetch.
   A fictional "Springfield" jurisdiction; statuses + a few near-matches
   chosen to exercise every verdict the engine can return.
   ============================================================ */
window.VOTER_SAMPLE = [
  { id: "V001", name: "Robert A. Smith",   address: "42 Main St, Springfield 62704",        status: "active",    registeredOn: "2019-03-01", district: "1" },
  { id: "V002", name: "William Johnson",   address: "88 Oak Avenue, Springfield 62704",      status: "active",    registeredOn: "2018-06-15", district: "1" },
  { id: "V003", name: "Elizabeth Carter",  address: "17 Elm Lane, Springfield 62701",        status: "active",    registeredOn: "2020-01-20", district: "2" },
  { id: "V004", name: "James O'Brien",     address: "230 N Park Rd, Springfield 62704",      status: "inactive",  registeredOn: "2017-09-10", district: "1" },
  { id: "V005", name: "Maria Gonzalez",    address: "5 Sunset Blvd Apt 4, Springfield 62705", status: "active",   registeredOn: "2021-11-02", district: "1" },
  { id: "V006", name: "Katherine Lee",     address: "901 River Dr, Springfield 62704",       status: "cancelled", registeredOn: "2016-05-05", district: "1" },
  { id: "V007", name: "Daniel Nguyen",     address: "14 Birch Ct, Springfield 62704",        status: "active",    registeredOn: "2022-02-14", district: "1" },
  { id: "V008", name: "Patricia Williams", address: "360 Cedar Terrace, Springfield 62701",  status: "active",    registeredOn: "2015-08-30", district: "2" },
  { id: "V009", name: "Linda Martinez",    address: "612 Walnut Ave, Springfield 62705",     status: "active",    registeredOn: "2019-07-22", district: "1" },
  { id: "V010", name: "Charles Davis",     address: "29 Pine St, Springfield 62704",         status: "active",    registeredOn: "2014-04-04", district: "1" },
  { id: "V011", name: "Barbara Wilson",    address: "150 Lake Rd, Springfield 62701",        status: "active",    registeredOn: "2023-09-09", district: "2" },
  { id: "V012", name: "Michael Brown",     address: "77 Maple Dr, Springfield 62704",        status: "active",    registeredOn: "2018-12-01", district: "1" },
  { id: "V013", name: "Jennifer Garcia",   address: "8 Willow Way, Springfield 62705",       status: "active",    registeredOn: "2020-10-10", district: "1" },
  { id: "V014", name: "Richard Taylor",    address: "455 Aspen Ct, Springfield 62701",       status: "active",    registeredOn: "2017-03-18", district: "2" },
  { id: "V015", name: "Susan Miller",      address: "23 Cherry Ln, Springfield 62704",       status: "active",    registeredOn: "2021-05-25", district: "1" },
  { id: "V016", name: "Joseph Anderson",   address: "190 Spruce Ave, Springfield 62705",     status: "active",    registeredOn: "2016-11-30", district: "1" },
];

/* Sample chips for the capture UI — each maps to a known outcome so the engine's
   real behavior is visible at a tap (no fabrication; these run through the matcher). */
window.VOTER_SAMPLE_CHIPS = [
  { label: "Bob Smith · nickname",      name: "Bob Smith",       addr: "42 Main Street, Springfield 62704" },     // → VALID  (Bob→Robert, Street→St)
  { label: "Maria Gonzales · typo",     name: "Maria Gonzales",  addr: "5 Sunset Blvd #4, Springfield 62705" },    // → VALID  (Gonzales~Gonzalez)
  { label: "James O'Brien · inactive",  name: "James O'Brien",   addr: "230 North Park Road, Springfield 62704" }, // → INVALID (inactive voter)
  { label: "Katy Carter · gray match",  name: "Katy Carter",     addr: "17 Elm Lane, Springfield 62701" },         // → REVIEW (right house, wrong first name)
  { label: "Gregory Fox · unregistered", name: "Gregory Fox",    addr: "1200 Hill Rd, Springfield 62704" },        // → INVALID (not in file)
];
