import React, { useEffect, useMemo, useState } from "react";

type TicketStatus = "Open" | "In Progress" | "On Hold" | "Resolved" | "Closed";

type Note = { id: string; text: string; author?: string; createdAt: string };

type Ticket = {
  id: string;
  title: string;
  description: string;
  name: string;
  contactType: "email" | "phone";
  contactValue: string;
  category: string;
  team: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  notes: Note[];
};

const STORAGE_KEY = "quicket_tickets_v1";
const STORAGE_CONFIG_KEY = "quicket_config_v1";

function generateTicketId(seq: number) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const n = String(seq % 10000).padStart(4, "0");
  return `TCK-${y}${m}${day}-${n}`;
}

function loadTickets(): Ticket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Ticket[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveTickets(tickets: Ticket[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

const defaultCategories = ["Hardware", "Software", "Account/Access", "Networking", "Facilities", "Other"];
const defaultTeams = ["Service Desk", "Desktop Support", "Networking", "Development", "Facilities", "Unassigned"];

type Config = { categories: string[]; teams: string[] };

function loadConfig(): Config {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (!raw) return { categories: defaultCategories, teams: defaultTeams };
    const obj = JSON.parse(raw) as Config;
    return {
      categories: obj?.categories?.length ? obj.categories : defaultCategories,
      teams: obj?.teams?.length ? obj.teams : defaultTeams,
    };
  } catch {
    return { categories: defaultCategories, teams: defaultTeams };
  }
}

function saveConfig(cfg: Config) {
  localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(cfg));
}

function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </div>
  );
}

function TextInput({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input
        {...props}
        className={`w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${props.className || ""}`}
      />
    </label>
  );
}

function TextArea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <textarea
        {...props}
        className={`w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${props.className || ""}`}
      />
    </label>
  );
}

function Select({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <select
        {...props}
        className={`w-full rounded-xl border border-gray-300 px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${props.className || ""}`}
      >
        {children}
      </select>
    </label>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">{children}</span>;
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{children}</span>;
}

function Divider() {
  return <div className="h-px bg-gray-200 my-4" />;
}

export default function TicketingApp() {
  const [tab, setTab] = useState<"portal" | "admin">("portal");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [cfg, setCfg] = useState<Config>(loadConfig());
  const [seq, setSeq] = useState<number>(() => (loadTickets().length % 10000) + 1);
  const [submitMsg, setSubmitMsg] = useState<string>("");
  const [filters, setFilters] = useState({ q: "", status: "All", category: "All", team: "All" });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setTickets(loadTickets());
  }, []);

  useEffect(() => {
    saveTickets(tickets);
  }, [tickets]);

  useEffect(() => {
    saveConfig(cfg);
  }, [cfg]);

  useEffect(() => {
    runTests();
  }, []);

  const [form, setForm] = useState({
    title: "",
    description: "",
    name: "",
    contactType: "email" as "email" | "phone",
    contactValue: "",
    category: cfg.categories[0] || "Other",
    team: (cfg.teams.find((t) => t !== "Unassigned") ?? cfg.teams[0]) || "Unassigned",
  });

  useEffect(() => {
    setForm((f) => ({
      ...f,
      category: cfg.categories.includes(f.category) ? f.category : cfg.categories[0] || "Other",
      team: cfg.teams.includes(f.team) ? f.team : cfg.teams[0] || "Unassigned",
    }));
  }, [cfg]);

  function validate(): string[] {
    const errs: string[] = [];
    if (!form.title.trim()) errs.push("Title is required.");
    if (!form.description.trim()) errs.push("Description is required.");
    if (!form.name.trim()) errs.push("Your name is required.");
    if (!form.contactValue.trim()) errs.push("Contact info is required.");
    if (form.contactType === "email") {
      const ok = /.+@.+\..+/.test(form.contactValue.trim());
      if (!ok) errs.push("Please enter a valid email address.");
    } else {
      const digits = form.contactValue.replace(/\D/g, "");
      if (digits.length < 10) errs.push("Please enter a valid phone number (10+ digits).");
    }
    return errs;
  }

  function submitTicket() {
    const errs = validate();
    if (errs.length) {
      setSubmitMsg(errs.join(" \n"));
      return;
    }
    const now = new Date().toISOString();
    const newId = generateTicketId(seq);
    setSeq((s) => s + 1);
    const t: Ticket = {
      id: newId,
      title: form.title.trim(),
      description: form.description.trim(),
      name: form.name.trim(),
      contactType: form.contactType,
      contactValue: form.contactValue.trim(),
      category: form.category,
      team: form.team || "Unassigned",
      status: "Open",
      createdAt: now,
      updatedAt: now,
      notes: [],
    };
    setTickets((prev) => [t, ...prev]);
    setSubmitMsg(`Thanks! Your ticket was submitted. Save this ID: ${newId}`);
    setForm({
      title: "",
      description: "",
      name: "",
      contactType: "email",
      contactValue: "",
      category: cfg.categories[0] || "Other",
      team: (cfg.teams.find((t) => t !== "Unassigned") ?? cfg.teams[0]) || "Unassigned",
    });
  }

  const filtered = useMemo(() => {
    const q = filters.q.toLowerCase();
    return tickets.filter((t) => {
      const matchesQ =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.team.toLowerCase().includes(q);
      const matchesStatus = filters.status === "All" || t.status === (filters.status as TicketStatus);
      const matchesCat = filters.category === "All" || t.category === filters.category;
      const matchesTeam = filters.team === "All" || t.team === filters.team;
      return matchesQ && matchesStatus && matchesCat && matchesTeam;
    });
  }, [tickets, filters]);

  function updateTicket(id: string, changes: Partial<Ticket>) {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t)));
  }

  function deleteTicket(id: string) {
    if (!confirm("Delete this ticket? This cannot be undone.")) return;
    setTickets((prev) => prev.filter((t) => t.id !== id));
  }

  function exportCSV() {
    const headers = ["id", "title", "description", "name", "contactType", "contactValue", "category", "team", "status", "createdAt", "updatedAt"];
    const rows = [headers.join(",")] .concat(
      tickets.map((t) =>
        [
          t.id,
          t.title.replaceAll(",", ";"),
          t.description.replaceAll(",", ";"),
          t.name.replaceAll(",", ";"),
          t.contactType,
          t.contactValue,
          t.category,
          t.team,
          t.status,
          t.createdAt,
          t.updatedAt,
        ].join(",")
      )
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quicket</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTab("portal")}
                className={`px-4 py-2 rounded-xl text-sm font-medium border ${tab === "portal" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-gray-50"}`}
              >
                Self‑Service Portal
              </button>
              <button
                onClick={() => setTab("admin")}
                className={`px-4 py-2 rounded-xl text-sm font-medium border ${tab === "admin" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-gray-50"}`}
              >
                Admin Dashboard
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">All data is saved locally in your browser. To go multi‑user, wire this UI to an API (e.g., Express + SQLite/PostgreSQL).</p>
        </header>

        {tab === "portal" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Section title="Submit a Ticket">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput label="Title" placeholder="Short summary (e.g., Can't log in)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {cfg.categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                  <TextInput label="Your Name" placeholder="Jane Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                    <Select label="Preferred Contact Method" value={form.contactType} onChange={(e) => setForm({ ...form, contactType: e.target.value as any })}>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                    </Select>
                    <TextInput label={form.contactType === "email" ? "Email" : "Phone"} placeholder={form.contactType === "email" ? "you@example.com" : "(555) 123‑4567"} value={form.contactValue} onChange={(e) => setForm({ ...form, contactValue: e.target.value })} />
                  </div>
                  <Select label="Assign to Team (optional)" value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })}>
                    {cfg.teams.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                  <div className="md:col-span-2">
                    <TextArea label="Description" placeholder="Provide details, steps to reproduce, error messages, etc." rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
                {submitMsg && (
                  <div className="mt-2 text-sm whitespace-pre-line text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl p-3">{submitMsg}</div>
                )}
                <div className="mt-4 flex items-center gap-3">
                  <button onClick={submitTicket} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700">Submit Ticket</button>
                  <button
                    onClick={() =>
                      setForm({
                        title: "",
                        description: "",
                        name: "",
                        contactType: "email",
                        contactValue: "",
                        category: cfg.categories[0] || "Other",
                        team: (cfg.teams.find((t) => t !== "Unassigned") ?? cfg.teams[0]) || "Unassigned",
                      })
                    }
                    className="px-4 py-2 rounded-xl border hover:bg-gray-50"
                  >
                    Reset
                  </button>
                </div>
              </Section>
            </div>

            <div className="lg:col-span-1">
              <Section title="Categories & Teams">
                <p className="text-sm text-gray-600 mb-3">Customize your categories and assignment teams. Changes are saved to your browser.</p>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Categories</label>
                  <TagEditor values={cfg.categories} onChange={(vals) => setCfg((c) => ({ ...c, categories: vals }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Teams</label>
                  <TagEditor values={cfg.teams} onChange={(vals) => setCfg((c) => ({ ...c, teams: vals }))} />
                </div>
              </Section>
            </div>
          </div>
        )}

        {tab === "admin" && (
          <div className="grid grid-cols-1 gap-6">
            <Section
              title="Filters"
              actions={
                <div className="flex items-center gap-2">
                  <button onClick={exportCSV} className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm">Export CSV</button>
                  <button
                    onClick={() => {
                      if (!confirm("Reset ALL data (tickets + config)?")) return;
                      localStorage.removeItem(STORAGE_KEY);
                      localStorage.removeItem(STORAGE_CONFIG_KEY);
                      setTickets([]);
                      setCfg({ categories: defaultCategories, teams: defaultTeams });
                    }}
                    className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm"
                  >
                    Reset All
                  </button>
                </div>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <TextInput label="Search" placeholder="ID, title, requester, etc." value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
                <Select label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                  {["All", "Open", "In Progress", "On Hold", "Resolved", "Closed"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
                <Select label="Category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                  <option value="All">All</option>
                  {cfg.categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
                <Select label="Team" value={filters.team} onChange={(e) => setFilters({ ...filters, team: e.target.value })}>
                  <option value="All">All</option>
                  {cfg.teams.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>
            </Section>

            <Section title={`Tickets (${filtered.length})`}>
              {filtered.length === 0 ? (
                <div className="text-sm text-gray-600">No tickets match your filters.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.map((t) => (
                    <article key={t.id} className="border border-gray-200 rounded-2xl p-4 bg-white shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{t.title}</span>
                            <Pill className={statusPill(t.status)}>{t.status}</Pill>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">ID: {t.id}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelectedId(t.id)} className="text-indigo-600 hover:text-indigo-800 text-sm" title="Open details">Open</button>
                          <button onClick={() => deleteTicket(t.id)} className="text-gray-500 hover:text-red-600 text-sm" title="Delete">✕</button>
                        </div>
                      </div>

                      <Divider />

                      <p className="text-sm whitespace-pre-wrap">{t.description}</p>

                      <Divider />

                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge><span className="mr-1">Requester:</span> {t.name}</Badge>
                        <Badge><span className="mr-1">Contact:</span> {t.contactType === "email" ? "📧" : "📞"} {t.contactValue}</Badge>
                        <Badge><span className="mr-1">Category:</span> {t.category}</Badge>
                        <Badge><span className="mr-1">Team:</span> {t.team}</Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Select label="Status" value={t.status} onChange={(e) => updateTicket(t.id, { status: e.target.value as TicketStatus })}>
                          {["Open", "In Progress", "On Hold", "Resolved", "Closed"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </Select>
                        <Select label="Assign Team" value={t.team} onChange={(e) => updateTicket(t.id, { team: e.target.value })}>
                          {cfg.teams.map((tm) => (
                            <option key={tm} value={tm}>{tm}</option>
                          ))}
                        </Select>
                        <Select label="Category" value={t.category} onChange={(e) => updateTicket(t.id, { category: e.target.value })}>
                          {cfg.categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </Select>
                      </div>

                      <div className="mt-3 text-[11px] text-gray-500 flex flex-wrap gap-3">
                        <span>Created: {new Date(t.createdAt).toLocaleString()}</span>
                        <span>Updated: {new Date(t.updatedAt).toLocaleString()}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </div>

      {selectedId && (
        <DetailModal
          ticket={tickets.find((x) => x.id === selectedId)!}
          teams={cfg.teams}
          categories={cfg.categories}
          onClose={() => setSelectedId(null)}
          onSave={(changes) => updateTicket(selectedId, changes)}
          onAddNote={(text, author) => {
            const t = tickets.find((x) => x.id === selectedId);
            if (!t) return;
            const newNote = { id: `N-${Date.now()}`, text, author, createdAt: new Date().toISOString() } as Note;
            updateTicket(selectedId, { notes: [...t.notes, newNote] });
          }}
          onDeleteNote={(noteId) => {
            const t = tickets.find((x) => x.id === selectedId);
            if (!t) return;
            updateTicket(selectedId, { notes: t.notes.filter((n) => n.id !== noteId) });
          }}
        />
      )}
    </div>
  );
}

function DetailModal({ ticket, teams, categories, onClose, onSave, onAddNote, onDeleteNote }:{
  ticket: Ticket;
  teams: string[];
  categories: string[];
  onClose: () => void;
  onSave: (changes: Partial<Ticket>) => void;
  onAddNote: (text: string, author?: string) => void;
  onDeleteNote: (noteId: string) => void;
}) {
  const [draft, setDraft] = useState({
    title: ticket.title,
    description: ticket.description,
    name: ticket.name,
    contactType: ticket.contactType,
    contactValue: ticket.contactValue,
    category: ticket.category,
    team: ticket.team,
    status: ticket.status,
  });
  const [noteText, setNoteText] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("");

  function handleSave(){
    onSave({ ...draft });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 border border-gray-100">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold">Edit Ticket — {ticket.id}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <Select label="Status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as TicketStatus })}>
            {["Open", "In Progress", "On Hold", "Resolved", "Closed"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <TextInput label="Requester Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Select label="Category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <Select label="Assign Team" value={draft.team} onChange={(e) => setDraft({ ...draft, team: e.target.value })}>
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Select label="Contact Type" value={draft.contactType} onChange={(e) => setDraft({ ...draft, contactType: e.target.value as any })}>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
          </Select>
          <TextInput label={draft.contactType === "email" ? "Email" : "Phone"} value={draft.contactValue} onChange={(e) => setDraft({ ...draft, contactValue: e.target.value })} />
          <div className="md:col-span-2">
            <TextArea label="Description" rows={6} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
        </div>

        <Divider />

        <h4 className="text-sm font-semibold mb-2">Notes</h4>
        <div className="space-y-2 max-h-48 overflow-auto mb-3 pr-1">
          {ticket.notes.length === 0 && <div className="text-sm text-gray-500">No notes yet.</div>}
          {ticket.notes.map((n) => (
            <div key={n.id} className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl p-2">
              <div>
                <div className="text-sm whitespace-pre-wrap">{n.text}</div>
                <div className="text-[11px] text-gray-500 mt-1">{n.author ? `${n.author} • ` : ""}{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              <button className="text-gray-400 hover:text-red-600 text-xs" onClick={() => onDeleteNote(n.id)}>Delete</button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <TextInput label="Author (optional)" value={noteAuthor} onChange={(e) => setNoteAuthor(e.target.value)} />
          <div className="md:col-span-3">
            <TextArea label="Add a note" rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm"
            onClick={() => {
              if (!noteText.trim()) return;
              onAddNote(noteText.trim(), noteAuthor.trim() || undefined);
              setNoteText("");
              setNoteAuthor("");
            }}
          >
            Add Note
          </button>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="px-4 py-2 rounded-xl border hover:bg-gray-50" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function statusPill(status: TicketStatus) {
  switch (status) {
    case "Open":
      return "bg-indigo-100 text-indigo-700";
    case "In Progress":
      return "bg-yellow-100 text-yellow-800";
    case "On Hold":
      return "bg-gray-100 text-gray-700";
    case "Resolved":
      return "bg-emerald-100 text-emerald-700";
    case "Closed":
      return "bg-slate-200 text-slate-700";
  }
}

function TagEditor({ values, onChange }: { values: string[]; onChange: (vals: string[]) => void }) {
  const [input, setInput] = useState("");

  function addTag() {
    const v = input.trim();
    if (!v) return;
    if (values.includes(v)) return;
    onChange([...values, v]);
    setInput("");
  }

  function removeTag(v: string) {
    onChange(values.filter((x) => x !== v));
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTag();
          }}
          placeholder="Add and press Enter"
          className="flex-1 rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button onClick={addTag} className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm">Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs">
            {v}
            <button onClick={() => removeTag(v)} className="text-gray-500 hover:text-red-600">×</button>
          </span>
        ))}
        {!values.length && <span className="text-xs text-gray-500">No items yet</span>}
      </div>
    </div>
  );
}

function runTests() {
  try {
    const id = generateTicketId(7);
    if (!/^TCK-\d{8}-\d{4}$/.test(id)) throw new Error("bad id format");
    if (!statusPill("Open").includes("indigo")) throw new Error("status pill mapping");
    console.log("Quicket tests passed");
  } catch (e) {
    console.error("Quicket tests failed", e);
  }
}
