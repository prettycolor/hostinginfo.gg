import { useCallback, useEffect, useMemo, useState } from "react";
import NotFoundPage from "./_404";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";

type AdminListUser = {
  id: number;
  email: string;
  fullName: string | null;
  profileName: string | null;
  authProvider: string | null;
  emailVerified: boolean;
  level: number;
  totalXp: number;
  currentXp: number;
  isAdmin: boolean;
  isDisabled: boolean;
  disabledAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
};

type AdminDetailUser = {
  id: number;
  email: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  profileName: string | null;
  bio: string | null;
  emailVerified: boolean;
  authProvider: string | null;
  emailNotifications: boolean | null;
  scanAlerts: boolean | null;
  weeklyReports: boolean | null;
  marketingEmails: boolean | null;
  profileVisibility: string | null;
  showEmail: boolean | null;
  showStats: boolean | null;
  level: number;
  totalXp: number;
  currentXp: number;
  xpToNextLevel: number;
  selectedAvatarId: number | null;
  isAdmin: boolean;
  isDisabled: boolean;
  disabledAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
};

type StatusFilter = "active" | "disabled" | "all";

const statusOptions: StatusFilter[] = ["active", "disabled", "all"];

function normalizeBool(value: unknown): boolean {
  return Boolean(value);
}

export default function AdminPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AdminListUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminDetailUser | null>(
    null,
  );
  const [editForm, setEditForm] = useState<Partial<AdminDetailUser>>({});
  const [loadingList, setLoadingList] = useState(false);
  const [loadingUserId, setLoadingUserId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    fullName: "",
    profileName: "",
  });

  const token = useMemo(() => localStorage.getItem("auth_token"), []);

  const adminFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const response = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init?.headers || {}),
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Request failed");
      }
      return data;
    },
    [token],
  );

  const loadUsers = useCallback(async () => {
    setLoadingList(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "50",
        status,
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }
      const data = await adminFetch(`/api/admin/users?${params.toString()}`);
      setItems(data.users || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load users",
      );
    } finally {
      setLoadingList(false);
    }
  }, [adminFetch, search, status]);

  const loadUser = useCallback(
    async (id: number) => {
      setLoadingUserId(id);
      setError("");
      try {
        const data = await adminFetch(`/api/admin/users/${id}`);
        setSelectedUser(data.user);
        setEditForm(data.user);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load user",
        );
      } finally {
        setLoadingUserId(null);
      }
    },
    [adminFetch],
  );

  useEffect(() => {
    if (user?.isAdmin) {
      void loadUsers();
    }
  }, [user?.isAdmin, loadUsers]);

  if (!user?.isAdmin) {
    return <NotFoundPage />;
  }

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    setMessage("");
    try {
      await adminFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: createForm.email,
          password: createForm.password,
          fullName: createForm.fullName || null,
          profileName: createForm.profileName || null,
        }),
      });
      setCreateForm({ email: "", password: "", fullName: "", profileName: "" });
      setCreateOpen(false);
      setMessage("User created successfully.");
      await loadUsers();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create user",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        email: editForm.email,
        fullName: editForm.fullName ?? null,
        firstName: editForm.firstName ?? null,
        lastName: editForm.lastName ?? null,
        profileName: editForm.profileName ?? null,
        bio: editForm.bio ?? null,
        emailVerified: normalizeBool(editForm.emailVerified),
        authProvider: editForm.authProvider ?? "email",
        emailNotifications: normalizeBool(editForm.emailNotifications),
        scanAlerts: normalizeBool(editForm.scanAlerts),
        weeklyReports: normalizeBool(editForm.weeklyReports),
        marketingEmails: normalizeBool(editForm.marketingEmails),
        profileVisibility: editForm.profileVisibility ?? "public",
        showEmail: normalizeBool(editForm.showEmail),
        showStats: normalizeBool(editForm.showStats),
        level: Number(editForm.level ?? 1),
        totalXp: Number(editForm.totalXp ?? 0),
        currentXp: Number(editForm.currentXp ?? 0),
        xpToNextLevel: Number(editForm.xpToNextLevel ?? 100),
        selectedAvatarId:
          typeof editForm.selectedAvatarId === "number"
            ? editForm.selectedAvatarId
            : null,
      };
      const data = await adminFetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setSelectedUser(data.user);
      setEditForm(data.user);
      setMessage("User updated successfully.");
      await loadUsers();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save user",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDisableToggle = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (selectedUser.isDisabled) {
        await adminFetch(`/api/admin/users/${selectedUser.id}/reactivate`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        setMessage("User reactivated.");
      } else {
        await adminFetch(`/api/admin/users/${selectedUser.id}`, {
          method: "DELETE",
        });
        setMessage("User disabled and sessions revoked.");
      }
      await loadUsers();
      await loadUser(selectedUser.id);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to update user status",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSendReset = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await adminFetch(
        `/api/admin/users/${selectedUser.id}/password-reset`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      setMessage(
        data.emailSent
          ? "Password reset email sent."
          : "Reset token created but email delivery failed.",
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to send password reset",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`Admin Console | ${PAGE_META.dashboard.title}`}
        description="Admin-only account management console."
        noindex
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Admin Console</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage users, disable/reactivate accounts, and trigger password
                resets.
              </p>
            </div>
            <Button onClick={() => setCreateOpen((prev) => !prev)}>
              {createOpen ? "Close Create Form" : "Create User"}
            </Button>
          </CardHeader>
          {createOpen && (
            <CardContent className="grid gap-3 border-t pt-6">
              <div className="grid gap-2">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-full-name">Full Name</Label>
                <Input
                  id="new-full-name"
                  value={createForm.fullName}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      fullName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-profile-name">Username</Label>
                <Input
                  id="new-profile-name"
                  value={createForm.profileName}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      profileName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create User"
                  )}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <div className="grid gap-3">
                <Input
                  placeholder="Search email, name, username"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <Button
                      key={option}
                      variant={status === option ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatus(option)}
                    >
                      {option}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loadUsers()}
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[70vh] overflow-auto">
              {loadingList ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading users...
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users found.</p>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    className={`w-full text-left rounded-lg border p-3 transition ${
                      selectedUser?.id === item.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                    onClick={() => void loadUser(item.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{item.email}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          item.isDisabled
                            ? "bg-destructive/10 text-destructive"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {item.isDisabled ? "disabled" : "active"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.fullName || item.profileName || "No name"} • Level{" "}
                      {item.level}
                    </p>
                    {loadingUserId === item.id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Loading...
                      </p>
                    )}
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedUser ? (
                <p className="text-sm text-muted-foreground">
                  Select a user to view and edit details.
                </p>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Email</Label>
                      <Input
                        value={editForm.email || ""}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Username</Label>
                      <Input
                        value={editForm.profileName || ""}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            profileName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Full Name</Label>
                      <Input
                        value={editForm.fullName || ""}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            fullName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>First Name</Label>
                      <Input
                        value={editForm.firstName || ""}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            firstName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Last Name</Label>
                      <Input
                        value={editForm.lastName || ""}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            lastName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Provider</Label>
                      <Input
                        value={editForm.authProvider || "email"}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            authProvider: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Level</Label>
                      <Input
                        type="number"
                        value={editForm.level ?? 1}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            level: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Total XP</Label>
                      <Input
                        type="number"
                        value={editForm.totalXp ?? 0}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            totalXp: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Current XP</Label>
                      <Input
                        type="number"
                        value={editForm.currentXp ?? 0}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            currentXp: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>XP To Next Level</Label>
                      <Input
                        type="number"
                        value={editForm.xpToNextLevel ?? 100}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            xpToNextLevel: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Bio</Label>
                    <Textarea
                      value={editForm.bio || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          bio: e.target.value,
                        }))
                      }
                      rows={4}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSendReset}
                      disabled={saving}
                    >
                      Send Password Reset
                    </Button>
                    <Button
                      variant={
                        selectedUser.isDisabled ? "default" : "destructive"
                      }
                      onClick={handleDisableToggle}
                      disabled={saving}
                    >
                      {selectedUser.isDisabled
                        ? "Reactivate User"
                        : "Disable User"}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Admin: {selectedUser.isAdmin ? "yes" : "no"} (DB-only)
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {message && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
