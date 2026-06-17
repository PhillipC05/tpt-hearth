"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Card, Input, Select } from "@tpt-hearth/ui";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/api";
import { GentleEmptyState } from "@/components";
import {
  ShieldCheck,
  Settings,
  Users,
  DoorOpen,
  ScrollText,
  Siren,
  Eye,
  Sprout,
  Plus,
  Trash2,
  Loader2,
  Check
} from "lucide-react";
import type { Report, ModerationAction, TransparencyLog } from "@tpt-hearth/shared";

type ReportWithReporter = Report & { reporterName: string | null };
type ModActionWithNames = ModerationAction & { actorName: string | null; targetName: string | null };
type Invite = {
  id: string;
  code: string;
  createdByUserId: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>("settings");

  // Settings
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Invites
  const [invites, setInvites] = useState<Invite[]>([]);
  const [newInviteMaxUses, setNewInviteMaxUses] = useState(1);
  const [creatingInvite, setCreatingInvite] = useState(false);

  // Reports
  const [reports, setReports] = useState<ReportWithReporter[]>([]);

  // Moderation actions
  const [modActions, setModActions] = useState<ModActionWithNames[]>([]);

  // Transparency logs
  const [transparencyLogs, setTransparencyLogs] = useState<TransparencyLog[]>([]);

  // Seed state
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    const result = await getJson<Record<string, string>>("/api/admin/settings");
    if (result.ok) setSettings(result.data);
  }, []);

  const fetchInvites = useCallback(async () => {
    const result = await getJson<Invite[]>("/api/admin/invites");
    if (result.ok) setInvites(result.data);
  }, []);

  const fetchReports = useCallback(async () => {
    const result = await getJson<ReportWithReporter[]>("/api/reports");
    if (result.ok) setReports(result.data);
  }, []);

  const fetchModActions = useCallback(async () => {
    const result = await getJson<ModActionWithNames[]>("/api/moderation");
    if (result.ok) setModActions(result.data);
  }, []);

  const fetchTransparencyLogs = useCallback(async () => {
    const result = await getJson<TransparencyLog[]>("/api/transparency-log");
    if (result.ok) setTransparencyLogs(result.data);
  }, []);

  useEffect(() => {
    Promise.all([
      fetchSettings(),
      fetchInvites(),
      fetchReports(),
      fetchModActions(),
      fetchTransparencyLogs()
    ]).finally(() => setLoading(false));
  }, [fetchSettings, fetchInvites, fetchReports, fetchModActions, fetchTransparencyLogs]);

  const handleUpdateSetting = async (key: string, value: string) => {
    setSettingsSaving(true);
    const result = await postJson("/api/admin/settings", { key, value });
    if (result.ok) {
      setSettings((prev) => ({ ...prev, [key]: value }));
    }
    setSettingsSaving(false);
  };

  const handleCreateInvite = async () => {
    setCreatingInvite(true);
    const result = await postJson<{ code: string }>("/api/admin/invites", { maxUses: newInviteMaxUses });
    if (result.ok) {
      setNewInviteMaxUses(1);
      fetchInvites();
    }
    setCreatingInvite(false);
  };

  const handleDeleteInvite = async (inviteId: string) => {
    const result = await deleteJson(`/api/admin/invites/${inviteId}`);
    if (result.ok) fetchInvites();
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    setSeedResult(null);
    const result = await postJson("/api/admin/seed", {});
    if (result.ok) {
      setSeedResult("Demo data seeded successfully.");
      // Refresh all data
      fetchSettings();
      fetchInvites();
      fetchReports();
      fetchModActions();
      fetchTransparencyLogs();
    } else {
      setSeedResult("Failed to seed demo data.");
    }
    setSeeding(false);
  };

  const handleResolveReport = async (reportId: string) => {
    const result = await patchJson(`/api/reports/${reportId}`, { status: "resolved" });
    if (result.ok) fetchReports();
  };

  if (loading) {
    return (
      <div className="section-stack flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-ember" />
      </div>
    );
  }

  const sections = [
    { id: "settings", label: "Server Settings", icon: Settings },
    { id: "invites", label: "Invites", icon: Users },
    { id: "reports", label: "Reports", icon: Siren },
    { id: "moderation", label: "Moderation Log", icon: ShieldCheck },
    { id: "transparency", label: "Transparency Log", icon: Eye },
    { id: "seed", label: "Demo Data", icon: Sprout }
  ];

  return (
    <div className="section-stack">
      <section className="page-enter">
        <div>
          <h1 className="text-display">Admin</h1>
          <p className="mt-2 max-w-2xl text-body text-sand/68">
            Server administration. Calm and transparent controls for the lodge.
          </p>
        </div>
      </section>

      {/* Section navigation */}
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
              activeSection === section.id
                ? "bg-ember text-ash"
                : "border border-sand/15 bg-white/[0.035] text-sand/68 hover:border-ember/30"
            }`}
          >
            <section.icon className="h-4 w-4" />
            {section.label}
          </button>
        ))}
      </div>

      {/* Server Settings */}
      {activeSection === "settings" && (
        <Card className="page-enter p-6">
          <h2 className="text-display-sm flex items-center gap-2">
            <Settings className="h-5 w-5 text-ember" />
            Server Settings
          </h2>
          <div className="mt-6 calm-stack">
            <div>
              <label className="mb-1 block text-sm text-sand/68">Porch Mode</label>
              <select
                value={settings.porch_mode ?? "open_lobby"}
                onChange={(e) => handleUpdateSetting("porch_mode", e.target.value)}
                className="w-full rounded-xl border border-sand/15 bg-white/[0.045] px-4 py-3 text-sand focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30"
              >
                <option value="random_matching">Random Matching</option>
                <option value="open_lobby">Open Lobby</option>
              </select>
              <p className="mt-1 text-xs text-sand/48">Controls how Porch sessions are matched.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm text-sand/68">Room Visibility Policy</label>
              <select
                value={settings.room_policy ?? "open"}
                onChange={(e) => handleUpdateSetting("room_policy", e.target.value)}
                className="w-full rounded-xl border border-sand/15 bg-white/[0.045] px-4 py-3 text-sand focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30"
              >
                <option value="open">Open (anyone can create rooms)</option>
                <option value="steward_only">Steward Only (admins create rooms)</option>
              </select>
              <p className="mt-1 text-xs text-sand/48">Controls who can create new rooms.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm text-sand/68">Default Privacy Mode</label>
              <select
                value={settings.default_privacy ?? "open_plaintext"}
                onChange={(e) => handleUpdateSetting("default_privacy", e.target.value)}
                className="w-full rounded-xl border border-sand/15 bg-white/[0.045] px-4 py-3 text-sand focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30"
              >
                <option value="open_plaintext">Open (plaintext)</option>
                <option value="private_e2e">Private (E2E encryption)</option>
              </select>
              <p className="mt-1 text-xs text-sand/48">Default privacy mode for new rooms.</p>
            </div>

            {settingsSaving && (
              <p className="text-xs text-ember">Saving...</p>
            )}
          </div>
        </Card>
      )}

      {/* Invites */}
      {activeSection === "invites" && (
        <Card className="page-enter p-6">
          <h2 className="text-display-sm flex items-center gap-2">
            <Users className="h-5 w-5 text-ember" />
            Invite Management
          </h2>

          <div className="mt-4 flex items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-sand/68">Max uses</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={newInviteMaxUses}
                onChange={(e) => setNewInviteMaxUses(Number(e.target.value))}
                className="w-24"
              />
            </div>
            <Button onClick={handleCreateInvite} disabled={creatingInvite}>
              <Plus className="mr-2 h-4 w-4" />
              {creatingInvite ? "Creating..." : "Generate invite code"}
            </Button>
          </div>

          {invites.length === 0 ? (
            <GentleEmptyState
              title="No invites yet"
              description="Invite codes allow new users to join the lodge."
              icon={<Users className="h-6 w-6" />}
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between gap-4 rounded-2xl border border-sand/15 bg-white/[0.035] p-4">
                  <div>
                    <code className="rounded bg-white/10 px-2 py-1 font-mono text-sm text-ember">{invite.code}</code>
                    <div className="mt-1 flex gap-4 text-xs text-sand/48">
                      <span>Used: {invite.usedCount}/{invite.maxUses}</span>
                      <span>Created: {new Date(invite.createdAt).toLocaleDateString()}</span>
                      {invite.expiresAt && (
                        <span>Expires: {new Date(invite.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteInvite(invite.id)}
                    className="rounded-full p-2 text-sand/48 transition-colors hover:bg-red-900/20 hover:text-red-400"
                    aria-label="Delete invite"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Reports */}
      {activeSection === "reports" && (
        <Card className="page-enter p-6">
          <h2 className="text-display-sm flex items-center gap-2">
            <Siren className="h-5 w-5 text-ember" />
            Reports
          </h2>

          {reports.length === 0 ? (
            <GentleEmptyState
              title="No reports"
              description="When users report content, it will appear here for review."
              icon={<Siren className="h-6 w-6" />}
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {reports.map((report) => (
                <div key={report.id} className="rounded-2xl border border-sand/15 bg-white/[0.035] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                          report.status === "open"
                            ? "bg-red-900/20 text-red-400"
                            : report.status === "reviewed"
                            ? "bg-amber-900/20 text-amber-400"
                            : "bg-green-900/20 text-green-400"
                        }`}>
                          {report.status}
                        </span>
                        <span className="text-xs text-sand/48">by {report.reporterName ?? "Unknown"}</span>
                      </div>
                      <p className="mt-2 text-sm text-sand/78">{report.reason}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sand/48">
                        {report.targetUserId && <span>Target user: {report.targetUserId.slice(0, 8)}...</span>}
                        {report.targetRoomId && <span>Target room: {report.targetRoomId.slice(0, 8)}...</span>}
                        <span>{new Date(report.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                    {report.status === "open" && (
                      <Button size="sm" variant="outline" onClick={() => handleResolveReport(report.id)}>
                        <Check className="mr-1 h-3 w-3" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Moderation Log */}
      {activeSection === "moderation" && (
        <Card className="page-enter p-6">
          <h2 className="text-display-sm flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-ember" />
            Moderation Log
          </h2>

          {modActions.length === 0 ? (
            <GentleEmptyState
              title="No moderation actions"
              description="Moderation actions like mutes and bans will be logged here."
              icon={<ShieldCheck className="h-6 w-6" />}
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {modActions.map((action) => (
                <div key={action.id} className="rounded-2xl border border-sand/15 bg-white/[0.035] p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-ember/10 px-2.5 py-0.5 text-xs text-ember">
                      {action.action}
                    </span>
                    <span className="text-xs text-sand/48">by {action.actorName ?? "Unknown"}</span>
                  </div>
                  <p className="mt-2 text-sm text-sand/78">{action.reason}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sand/48">
                    {action.targetName && <span>Target: {action.targetName}</span>}
                    <span>{new Date(action.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Transparency Log */}
      {activeSection === "transparency" && (
        <Card className="page-enter p-6">
          <h2 className="text-display-sm flex items-center gap-2">
            <Eye className="h-5 w-5 text-ember" />
            Transparency Log
          </h2>

          {transparencyLogs.length === 0 ? (
            <GentleEmptyState
              title="No transparency logs"
              description="Public notes about moderation actions will appear here."
              icon={<Eye className="h-6 w-6" />}
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {transparencyLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-sand/15 bg-white/[0.035] p-4">
                  <p className="text-sm text-sand/78">{log.publicNote}</p>
                  <p className="mt-1 text-xs text-sand/48">
                    {new Date(log.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Demo Seed */}
      {activeSection === "seed" && (
        <Card className="page-enter p-6">
          <h2 className="text-display-sm flex items-center gap-2">
            <Sprout className="h-5 w-5 text-ember" />
            Demo Data
          </h2>
          <p className="mt-2 text-sm text-sand/68">
            Seed the database with demo users, rooms, messages, rituals, reports, and moderation actions for testing.
          </p>
          <div className="mt-4">
            <Button onClick={handleSeedDemo} disabled={seeding}>
            <Sprout className="mr-2 h-4 w-4" />
              {seeding ? "Seeding..." : "Seed demo data"}
            </Button>
            {seedResult && (
              <p className={`mt-3 text-sm ${seedResult.includes("successfully") ? "text-green-400" : "text-red-400"}`}>
                {seedResult}
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}