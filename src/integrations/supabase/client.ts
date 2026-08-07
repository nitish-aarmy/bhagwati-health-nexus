// Local offline data client that mimics the subset of Supabase APIs used by this app.

type AnyRecord = Record<string, unknown>;

type LocalUser = {
  id: string;
  email: string;
  password: string;
  phone?: string | null;
  raw_user_meta_data?: Record<string, unknown>;
  created_at: string;
};

type LocalSession = {
  access_token: string;
  user: {
    id: string;
    email: string;
    phone?: string | null;
    user_metadata?: Record<string, unknown>;
  };
};

type LocalDb = {
  auth_users: LocalUser[];
  session_user_id: string | null;
  counters: {
    uhid: number;
    invoice: number;
    audit: number;
  };
  tables: {
    profiles: AnyRecord[];
    user_roles: AnyRecord[];
    patients: AnyRecord[];
    appointments: AnyRecord[];
    ipd_admissions: AnyRecord[];
    lab_orders: AnyRecord[];
    invoices: AnyRecord[];
    payment_transactions: AnyRecord[];
    password_reset_otps: AnyRecord[];
    follow_ups: AnyRecord[];
    call_logs: AnyRecord[];
    audit_logs: AnyRecord[];
  };
};

type QueryResult<T = unknown> = { data: T; error: { message: string } | null };

export const DB_KEY = "bhagwati.local.db.v1";

const authListeners = new Set<(event: string, session: LocalSession | null) => void>();

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return null;
}

function phoneIdentityToEmail(phone: string): string {
  return `m${phone}@patient.local`;
}

function seedDatabase(): LocalDb {
  const now = nowIso();
  const adminId = randomId();
  const patientId = randomId();

  const db: LocalDb = {
    auth_users: [
      {
        id: adminId,
        email: "admin@bhagwati.local",
        password: "Admin@12345",
        raw_user_meta_data: { full_name: "Bhagwati Admin" },
        created_at: now,
      },
      {
        id: patientId,
        email: "patient@bhagwati.local",
        password: "Patient@12345",
        phone: "9999999902",
        raw_user_meta_data: { full_name: "Demo Patient" },
        created_at: now,
      },
    ],
    session_user_id: null,
    counters: { uhid: 1001, invoice: 1, audit: 1 },
    tables: {
      profiles: [
        {
          id: adminId,
          full_name: "Bhagwati Admin",
          employee_code: "ADM-001",
          department: "Administration",
          designation: "System Administrator",
          phone: "+919999999901",
          avatar_url: null,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: patientId,
          full_name: "Demo Patient",
          employee_code: null,
          department: null,
          designation: null,
          phone: "+919999999902",
          avatar_url: null,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ],
      user_roles: [
        { id: randomId(), user_id: adminId, role: "super_admin", created_at: now },
        { id: randomId(), user_id: adminId, role: "admin", created_at: now },
        { id: randomId(), user_id: patientId, role: "patient", created_at: now },
      ],
      patients: [
        {
          id: randomId(),
          uhid: "BH-26-001001",
          user_id: patientId,
          full_name: "Demo Patient",
          age: 31,
          date_of_birth: null,
          gender: "female",
          phone: "+919999999902",
          alt_phone: null,
          email: "patient@bhagwati.local",
          address: "Daltonganj",
          city: "Daltonganj",
          blood_group: "B+",
          allergies: null,
          chronic_conditions: null,
          lead_source: "Walk-in",
          referring_doctor: null,
          insurance_provider: null,
          insurance_number: null,
          emergency_contact: null,
          notes: null,
          created_by: adminId,
          created_at: now,
          updated_at: now,
        },
      ],
      appointments: [],
      ipd_admissions: [],
      lab_orders: [],
      invoices: [],
      payment_transactions: [],
      password_reset_otps: [],
      follow_ups: [],
      call_logs: [],
      audit_logs: [],
    },
  };

  return db;
}

function getDb(): LocalDb {
  if (!isBrowser()) return seedDatabase();

  const raw = window.localStorage.getItem(DB_KEY);
  if (!raw) {
    const seeded = seedDatabase();
    window.localStorage.setItem(DB_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalDb>;
    const normalized = normalizeDb(parsed);
    saveDb(normalized);
    return normalized;
  } catch {
    const seeded = seedDatabase();
    window.localStorage.setItem(DB_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function normalizeDb(raw: Partial<LocalDb>): LocalDb {
  const now = nowIso();
  const tables = raw.tables ?? ({} as Partial<LocalDb["tables"]>);
  return {
    auth_users: Array.isArray(raw.auth_users) ? raw.auth_users : [],
    session_user_id: raw.session_user_id ?? null,
    counters: {
      uhid: Number(raw.counters?.uhid ?? 1001),
      invoice: Number(raw.counters?.invoice ?? 1),
      audit: Number(raw.counters?.audit ?? 1),
    },
    tables: {
      profiles: Array.isArray(tables.profiles) ? tables.profiles : [],
      user_roles: Array.isArray(tables.user_roles) ? tables.user_roles : [],
      patients: Array.isArray(tables.patients) ? tables.patients : [],
      appointments: Array.isArray(tables.appointments) ? tables.appointments : [],
      ipd_admissions: Array.isArray(tables.ipd_admissions) ? tables.ipd_admissions : [],
      lab_orders: Array.isArray(tables.lab_orders) ? tables.lab_orders : [],
      invoices: Array.isArray(tables.invoices) ? tables.invoices : [],
      payment_transactions: Array.isArray(tables.payment_transactions)
        ? tables.payment_transactions
        : [],
      password_reset_otps: Array.isArray(tables.password_reset_otps)
        ? tables.password_reset_otps
        : [],
      follow_ups: Array.isArray(tables.follow_ups) ? tables.follow_ups : [],
      call_logs: Array.isArray(tables.call_logs) ? tables.call_logs : [],
      audit_logs: Array.isArray(tables.audit_logs)
        ? tables.audit_logs
        : [{ id: 1, created_at: now, metadata: { migrated: true } }],
    },
  };
}

function saveDb(db: LocalDb) {
  if (!isBrowser()) return;
  window.localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function isValidLocalDbShape(value: unknown): value is LocalDb {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<LocalDb>;
  return Boolean(
    Array.isArray(v.auth_users) &&
      typeof v.counters === "object" &&
      typeof v.tables === "object" &&
      v.tables != null,
  );
}

function toSession(user: LocalUser | null): LocalSession | null {
  if (!user) return null;
  return {
    access_token: `local-${user.id}`,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone ?? null,
      user_metadata: user.raw_user_meta_data ?? {},
    },
  };
}

function getSessionUser(db: LocalDb): LocalUser | null {
  if (!db.session_user_id) return null;
  return db.auth_users.find((u) => u.id === db.session_user_id) ?? null;
}

function notifyAuth(event: string, session: LocalSession | null) {
  authListeners.forEach((fn) => fn(event, session));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function attachPatientRefs(table: string, rows: AnyRecord[]) {
  if (![
    "appointments",
    "ipd_admissions",
    "lab_orders",
    "invoices",
    "payment_transactions",
    "follow_ups",
    "call_logs",
  ].includes(table)) {
    return rows;
  }
  const db = getDb();
  const patients = db.tables.patients;
  return rows.map((row) => {
    const patientId = String(row.patient_id ?? "");
    const patient = patients.find((p) => String(p.id) === patientId) ?? null;
    return {
      ...row,
      patients: patient
        ? {
            full_name: patient.full_name,
            uhid: patient.uhid,
            phone: patient.phone,
          }
        : null,
    };
  });
}

function ensurePatientUhid(db: LocalDb): string {
  const value = db.counters.uhid;
  db.counters.uhid += 1;
  const padded = String(value).padStart(6, "0");
  return `BH-${new Date().getFullYear().toString().slice(-2)}-${padded}`;
}

function ensureInvoiceNumber(db: LocalDb): string {
  const value = db.counters.invoice;
  db.counters.invoice += 1;
  const padded = String(value).padStart(5, "0");
  return `INV-${new Date().getFullYear()}-${padded}`;
}

function getUserByIdentifier(db: LocalDb, identifier: string): LocalUser | null {
  const emailInput = identifier.trim().toLowerCase();
  const phoneInput = normalizePhone(identifier);

  let user = db.auth_users.find(
    (u) =>
      u.email.toLowerCase() === emailInput ||
      (phoneInput != null && normalizePhone(u.phone ?? null) === phoneInput),
  );

  if (!user && phoneInput) {
    const mobileIdentity = phoneIdentityToEmail(phoneInput);
    user = db.auth_users.find((u) => u.email.toLowerCase() === mobileIdentity);
  }

  if (!user && phoneInput) {
    const linkedPatient = db.tables.patients.find(
      (p) => normalizePhone(p.phone ?? null) === phoneInput && typeof p.user_id === "string",
    );
    if (linkedPatient && typeof linkedPatient.user_id === "string") {
      user = db.auth_users.find((u) => u.id === linkedPatient.user_id);
    }
  }

  return user ?? null;
}

function generateOtp(): string {
  const value = Math.floor(100000 + Math.random() * 900000);
  return String(value);
}

function hasPatientRecordByMobile(db: LocalDb, identifier: string): boolean {
  const phone = normalizePhone(identifier);
  if (!phone) return false;
  return db.tables.patients.some((p) => normalizePhone(p.phone ?? null) === phone);
}

function tableDefaults(table: string, row: AnyRecord, db: LocalDb): AnyRecord {
  const now = nowIso();

  if (table === "patients") {
    return {
      id: row.id ?? randomId(),
      uhid: row.uhid ?? ensurePatientUhid(db),
      city: row.city ?? "Daltonganj",
      created_at: row.created_at ?? now,
      updated_at: row.updated_at ?? now,
      ...row,
    };
  }

  if (table === "invoices") {
    return {
      id: row.id ?? randomId(),
      invoice_number: row.invoice_number ?? ensureInvoiceNumber(db),
      items: row.items ?? [],
      subtotal: row.subtotal ?? 0,
      discount: row.discount ?? 0,
      tax: row.tax ?? 0,
      total: row.total ?? 0,
      paid_amount: row.paid_amount ?? 0,
      status: row.status ?? "unpaid",
      created_at: row.created_at ?? now,
      updated_at: row.updated_at ?? now,
      ...row,
    };
  }

  if (table === "ipd_admissions") {
    return {
      id: row.id ?? randomId(),
      admission_status: row.admission_status ?? "requested",
      ward: row.ward ?? null,
      bed_number: row.bed_number ?? null,
      admitted_at: row.admitted_at ?? now,
      discharged_at: row.discharged_at ?? null,
      created_at: row.created_at ?? now,
      updated_at: row.updated_at ?? now,
      ...row,
    };
  }

  if (table === "payment_transactions") {
    return {
      id: row.id ?? randomId(),
      transaction_type: row.transaction_type ?? "payment",
      amount: row.amount ?? 0,
      payment_mode: row.payment_mode ?? "cash",
      created_at: row.created_at ?? now,
      ...row,
    };
  }

  if (table === "audit_logs") {
    const id = db.counters.audit;
    db.counters.audit += 1;
    return {
      id,
      created_at: now,
      metadata: {},
      ...row,
    };
  }

  if (table === "call_logs") {
    return {
      id: row.id ?? randomId(),
      direction: row.direction ?? "outgoing",
      duration_seconds: row.duration_seconds ?? 0,
      created_at: row.created_at ?? now,
      ...row,
    };
  }

  return {
    id: row.id ?? randomId(),
    created_at: row.created_at ?? now,
    updated_at: row.updated_at ?? now,
    ...row,
  };
}

class LocalQueryBuilder implements PromiseLike<QueryResult<unknown>> {
  private readonly table: keyof LocalDb["tables"];
  private mode: "select" | "insert" | "update" | "upsert" = "select";
  private selectExpr = "*";
  private filters: Array<{ field: string; value: unknown }> = [];
  private orderBy: { field: string; ascending: boolean } | null = null;
  private rowLimit: number | null = null;
  private orTerm: string | null = null;
  private singleMode: "single" | "maybeSingle" | null = null;
  private writePayload: AnyRecord[] = [];
  private updatePayload: AnyRecord = {};
  private upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } = {};

  constructor(table: keyof LocalDb["tables"]) {
    this.table = table;
  }

  select(expr = "*") {
    this.selectExpr = expr;
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderBy = { field, ascending: options?.ascending ?? true };
    return this;
  }

  limit(value: number) {
    this.rowLimit = value;
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push({ field, value });
    return this;
  }

  or(pattern: string) {
    const match = /%(.+?)%/.exec(pattern);
    this.orTerm = (match?.[1] ?? "").toLowerCase();
    return this;
  }

  insert(payload: AnyRecord | AnyRecord[]) {
    this.mode = "insert";
    this.writePayload = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  update(payload: AnyRecord) {
    this.mode = "update";
    this.updatePayload = payload;
    return this;
  }

  upsert(payload: AnyRecord | AnyRecord[], options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.mode = "upsert";
    this.writePayload = Array.isArray(payload) ? payload : [payload];
    this.upsertOptions = options ?? {};
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }

  private executeSelect(): QueryResult<unknown> {
    const db = getDb();
    let rows = clone(db.tables[this.table]);

    rows = rows.filter((row) => this.filters.every((f) => row[f.field] === f.value));

    if (this.orTerm) {
      const term = this.orTerm;
      rows = rows.filter((row) => {
        const text = Object.values(row)
          .filter((v) => typeof v === "string")
          .join(" ")
          .toLowerCase();
        return text.includes(term);
      });
    }

    if (this.orderBy) {
      const { field, ascending } = this.orderBy;
      rows.sort((a, b) => {
        const va = a[field];
        const vb = b[field];
        if (va === vb) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (va > vb) return ascending ? 1 : -1;
        return ascending ? -1 : 1;
      });
    }

    if (this.rowLimit != null) rows = rows.slice(0, this.rowLimit);

    if (this.selectExpr.includes("patients(")) {
      rows = attachPatientRefs(String(this.table), rows);
    }

    if (this.singleMode === "single") {
      if (rows.length === 0) return { data: null, error: { message: "Row not found" } };
      return { data: rows[0], error: null };
    }

    if (this.singleMode === "maybeSingle") {
      return { data: rows[0] ?? null, error: null };
    }

    return { data: rows, error: null };
  }

  private executeInsert(): QueryResult<unknown> {
    const db = getDb();
    const tableRows = db.tables[this.table];
    const inserted = this.writePayload.map((row) => tableDefaults(String(this.table), row, db));
    inserted.forEach((row) => tableRows.push(row));
    saveDb(db);

    const result = inserted.length === 1 ? inserted[0] : inserted;
    if (this.singleMode === "single" || this.singleMode === "maybeSingle") {
      return { data: Array.isArray(result) ? result[0] : result, error: null };
    }
    return { data: result, error: null };
  }

  private executeUpdate(): QueryResult<unknown> {
    const db = getDb();
    const tableRows = db.tables[this.table];
    const now = nowIso();

    const updated: AnyRecord[] = [];
    for (const row of tableRows) {
      const matches = this.filters.every((f) => row[f.field] === f.value);
      if (!matches) continue;
      Object.assign(row, this.updatePayload);
      if ("updated_at" in row) row.updated_at = now;
      updated.push(clone(row));
    }

    saveDb(db);

    if (this.singleMode === "single") {
      if (updated.length === 0) return { data: null, error: { message: "Row not found" } };
      return { data: updated[0], error: null };
    }

    if (this.singleMode === "maybeSingle") {
      return { data: updated[0] ?? null, error: null };
    }

    return { data: updated, error: null };
  }

  private executeUpsert(): QueryResult<unknown> {
    const db = getDb();
    const tableRows = db.tables[this.table];
    const now = nowIso();

    const out: AnyRecord[] = [];
    for (const payload of this.writePayload) {
      let existing: AnyRecord | undefined;

      if (this.upsertOptions.onConflict === "user_id,role") {
        existing = tableRows.find(
          (r) => r.user_id === payload.user_id && r.role === payload.role,
        );
      } else if (payload.id != null) {
        existing = tableRows.find((r) => r.id === payload.id);
      }

      if (existing) {
        if (!this.upsertOptions.ignoreDuplicates) {
          Object.assign(existing, payload);
          if ("updated_at" in existing) existing.updated_at = now;
        }
        out.push(clone(existing));
      } else {
        const row = tableDefaults(String(this.table), payload, db);
        tableRows.push(row);
        out.push(clone(row));
      }
    }

    saveDb(db);

    if (this.singleMode === "single" || this.singleMode === "maybeSingle") {
      return { data: out[0] ?? null, error: null };
    }

    return { data: out, error: null };
  }

  private execute(): QueryResult<unknown> {
    try {
      if (this.mode === "insert") return this.executeInsert();
      if (this.mode === "update") return this.executeUpdate();
      if (this.mode === "upsert") return this.executeUpsert();
      return this.executeSelect();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected local data error";
      return { data: null, error: { message } };
    }
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

const supabaseImpl = {
  auth: {
    async getSession() {
      const db = getDb();
      const user = getSessionUser(db);
      return { data: { session: toSession(user) }, error: null };
    },

    async getUser() {
      const db = getDb();
      const user = getSessionUser(db);
      return { data: { user: toSession(user)?.user ?? null }, error: null };
    },

    onAuthStateChange(callback: (event: string, session: LocalSession | null) => void) {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(callback);
            },
          },
        },
      };
    },

    async signInWithPassword(credentials: { email: string; password: string }) {
      const db = getDb();
      const phoneInput = normalizePhone(credentials.email);
      const user = getUserByIdentifier(db, credentials.email);

      if (!user) {
        if (phoneInput && hasPatientRecordByMobile(db, phoneInput)) {
          const patient = db.tables.patients.find(
            (p) => normalizePhone(p.phone ?? null) === phoneInput,
          );

          const activatedUser: LocalUser = {
            id: randomId(),
            email: phoneIdentityToEmail(phoneInput),
            password: credentials.password,
            phone: phoneInput,
            raw_user_meta_data: {
              full_name: String(patient?.full_name ?? "Patient"),
              auto_activated_from_patient_record: true,
            },
            created_at: nowIso(),
          };

          db.auth_users.push(activatedUser);

          const hasRole = db.tables.user_roles.some(
            (r) => r.user_id === activatedUser.id && r.role === "patient",
          );
          if (!hasRole) {
            db.tables.user_roles.push({
              id: randomId(),
              user_id: activatedUser.id,
              role: "patient",
              created_at: nowIso(),
            });
          }

          const hasProfile = db.tables.profiles.some((p) => p.id === activatedUser.id);
          if (!hasProfile) {
            db.tables.profiles.push({
              id: activatedUser.id,
              full_name: String(patient?.full_name ?? "Patient"),
              employee_code: null,
              department: null,
              designation: null,
              phone: phoneInput,
              avatar_url: null,
              is_active: true,
              created_at: nowIso(),
              updated_at: nowIso(),
            });
          }

          if (patient) {
            patient.user_id = activatedUser.id;
            patient.email = patient.email ?? activatedUser.email;
            patient.updated_at = nowIso();
          }

          db.session_user_id = activatedUser.id;
          saveDb(db);
          const session = toSession(activatedUser);
          notifyAuth("SIGNED_IN", session);
          return { data: { user: session?.user ?? null, session }, error: null };
        }

        return {
          data: { user: null, session: null },
          error: { message: "No account found for this mobile/email" },
        };
      }

      if (user.password !== credentials.password) {
        return {
          data: { user: null, session: null },
          error: { message: "Invalid password" },
        };
      }

      db.session_user_id = user.id;
      saveDb(db);
      const session = toSession(user);
      notifyAuth("SIGNED_IN", session);
      return { data: { user: session?.user ?? null, session }, error: null };
    },

    async signUp(input: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown> };
    }) {
      const db = getDb();
      const phone = normalizePhone(String(input.options?.data?.mobile ?? ""));
      const existingPatient = phone
        ? db.tables.patients.find((p) => normalizePhone(p.phone ?? null) === phone)
        : undefined;
      const exists = db.auth_users.some(
        (u) =>
          u.email.toLowerCase() === input.email.toLowerCase() ||
          (phone != null && normalizePhone(u.phone ?? null) === phone),
      );
      if (exists) {
        return {
          data: { user: null, session: null },
          error: { message: "User already exists with this email/mobile" },
        };
      }

      const derivedEmail = phone ? phoneIdentityToEmail(phone) : input.email;
      const user: LocalUser = {
        id: randomId(),
        email: derivedEmail,
        password: input.password,
        phone,
        raw_user_meta_data: input.options?.data ?? {},
        created_at: nowIso(),
      };
      db.auth_users.push(user);

      const fullName = String(input.options?.data?.full_name ?? "").trim();
      db.tables.profiles.push({
        id: user.id,
        full_name: fullName || input.email,
        employee_code: null,
        department: null,
        designation: null,
        phone: phone ?? null,
        avatar_url: null,
        is_active: true,
        created_at: nowIso(),
        updated_at: nowIso(),
      });

      db.tables.user_roles.push({
        id: randomId(),
        user_id: user.id,
        role: "patient",
        created_at: nowIso(),
      });

      if (existingPatient) {
        existingPatient.user_id = user.id;
        existingPatient.phone = existingPatient.phone ?? phone;
        existingPatient.email = existingPatient.email ?? derivedEmail;
        existingPatient.updated_at = nowIso();
      } else {
        db.tables.patients.push({
          id: randomId(),
          uhid: ensurePatientUhid(db),
          user_id: user.id,
          full_name: fullName || derivedEmail,
          age: null,
          date_of_birth: null,
          gender: null,
          phone: phone ?? null,
          alt_phone: null,
          email: derivedEmail,
          address: null,
          city: "Daltonganj",
          blood_group: null,
          allergies: null,
          chronic_conditions: null,
          lead_source: "Self-registered",
          referring_doctor: null,
          insurance_provider: null,
          insurance_number: null,
          emergency_contact: null,
          notes: null,
          created_by: user.id,
          created_at: nowIso(),
          updated_at: nowIso(),
        });
      }

      db.session_user_id = user.id;
      saveDb(db);

      const session = toSession(user);
      notifyAuth("SIGNED_IN", session);
      return { data: { user: session?.user ?? null, session }, error: null };
    },

    async signOut() {
      const db = getDb();
      db.session_user_id = null;
      saveDb(db);
      notifyAuth("SIGNED_OUT", null);
      return { error: null };
    },

    async getClaims(_token: string) {
      return { data: null, error: { message: "Unsupported in local mode" } };
    },
  },

  from(table: keyof LocalDb["tables"]) {
    return new LocalQueryBuilder(table);
  },
};

export const supabase: any = supabaseImpl;

export function requestPasswordResetOtpByMobile(
  mobile: string,
): { ok: boolean; error?: string; otp?: string } {
  const normalized = normalizePhone(mobile);
  if (!normalized) return { ok: false, error: "Enter a valid 10-digit mobile number" };

  const db = getDb();
  const user = getUserByIdentifier(db, normalized);
  if (!user) return { ok: false, error: "No account found for this mobile number" };

  const now = Date.now();
  const ttlMs = 10 * 60 * 1000;
  const otp = generateOtp();

  db.tables.password_reset_otps = db.tables.password_reset_otps.filter((row) => {
    const expiry = new Date(String(row.expires_at ?? 0)).getTime();
    return expiry > now && !row.used;
  });

  db.tables.password_reset_otps.push({
    id: randomId(),
    user_id: user.id,
    mobile: normalized,
    otp,
    attempts: 0,
    used: false,
    created_at: nowIso(),
    expires_at: new Date(now + ttlMs).toISOString(),
  });

  saveDb(db);
  return { ok: true, otp };
}

export function resetPasswordWithMobileOtp(input: {
  mobile: string;
  otp: string;
  newPassword: string;
}): { ok: boolean; error?: string } {
  const normalized = normalizePhone(input.mobile);
  if (!normalized) return { ok: false, error: "Enter a valid 10-digit mobile number" };

  const nextPassword = String(input.newPassword ?? "");
  if (nextPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }

  const db = getDb();
  const user = getUserByIdentifier(db, normalized);
  if (!user) return { ok: false, error: "No account found for this mobile number" };

  const now = Date.now();
  const activeOtps = db.tables.password_reset_otps.filter(
    (row) =>
      row.user_id === user.id &&
      row.mobile === normalized &&
      !row.used &&
      new Date(String(row.expires_at ?? 0)).getTime() > now,
  );

  if (activeOtps.length === 0) {
    return { ok: false, error: "OTP expired. Please request a new OTP" };
  }

  const match = activeOtps.find((row) => String(row.otp) === String(input.otp).trim());
  if (!match) {
    activeOtps.forEach((row) => {
      const attempts = Number(row.attempts ?? 0) + 1;
      row.attempts = attempts;
      if (attempts >= 5) row.used = true;
    });
    saveDb(db);
    return { ok: false, error: "Invalid OTP" };
  }

  user.password = nextPassword;
  match.used = true;
  saveDb(db);
  return { ok: true };
}

export function readLocalDbSnapshot(): string {
  const db = getDb();
  return JSON.stringify(db, null, 2);
}

export function writeLocalDbSnapshot(snapshot: string): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(snapshot) as unknown;
    if (!isValidLocalDbShape(parsed)) {
      return { ok: false, error: "Invalid backup format" };
    }

    const db = normalizeDb(parsed as Partial<LocalDb>);
    saveDb(db);
    const user = getSessionUser(db);
    notifyAuth("SIGNED_IN", toSession(user));
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import backup";
    return { ok: false, error: message };
  }
}

export function resetLocalDb(): void {
  const db = seedDatabase();
  saveDb(db);
  notifyAuth("SIGNED_OUT", null);
}
