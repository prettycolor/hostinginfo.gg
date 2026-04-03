import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Trash2,
  AlertTriangle,
  History,
  User,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  Save,
  Mail,
  Key,
  Bell,
  Eye,
  EyeOff,
  Download,
  Palette,
  Lock,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserDisplayName, getUserInitials } from "@/lib/user-display";
import { clearCookieConsent } from "@/lib/cookie-consent";
import { getPasswordPolicyError } from "@/lib/password-policy";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";

interface ScanHistoryItem {
  id: number;
  domain: string;
  scanType: string;
  createdAt: string;
}

interface UserStats {
  totalScans: number;
  totalDomains: number;
  accountAge: number;
  lastLogin: string;
  level: number;
  xp: number;
}

interface ProfileData {
  profileName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  emailNotifications?: boolean;
  scanAlerts?: boolean;
  weeklyReports?: boolean;
  marketingEmails?: boolean;
  profileVisibility?: "public" | "private";
  showEmail?: boolean;
  showStats?: boolean;
}

type ConsentWindow = Window & {
  revokeAnalyticsConsent?: () => void;
};

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [clearHistoryLoading, setClearHistoryLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Profile editing state
  const [profileName, setProfileName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [scanAlerts, setScanAlerts] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const notificationsLocked = true;

  // Privacy settings
  const [profileVisibility, setProfileVisibility] = useState<
    "public" | "private"
  >("public");
  const [showEmail, setShowEmail] = useState(false);
  const [showStats, setShowStats] = useState(true);

  // Active tab
  const [activeTab, setActiveTab] = useState("profile");

  const fetchUserStats = useCallback(async () => {
    try {
      const authToken =
        token ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("authToken");
      if (!authToken) return;

      const response = await fetch("/api/profile/stats", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch user stats:", error);
    }
  }, [token]);

  const fetchScanHistory = useCallback(async () => {
    try {
      const authToken =
        token ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("authToken");
      if (!authToken) {
        setScanHistory([]);
        return;
      }

      // Match dashboard scan-history request/shape.
      const response = await fetch("/api/scan-history?days=30", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const history = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.scans)
            ? data.scans
            : [];
        setScanHistory(history);
      } else {
        setScanHistory([]);
      }
    } catch (error) {
      console.error("Failed to fetch scan history:", error);
      setScanHistory([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = await response.json();
          setProfileData(data);
          setProfileName(data.profileName || "");
          setFirstName(data.firstName || "");
          setLastName(data.lastName || "");
          setBio(data.bio || "");

          // Set notification preferences
          setEmailNotifications(data.emailNotifications ?? false);
          setScanAlerts(data.scanAlerts ?? false);
          setWeeklyReports(data.weeklyReports ?? false);
          setMarketingEmails(data.marketingEmails ?? false);

          // Set privacy settings
          setProfileVisibility(data.profileVisibility || "public");
          setShowEmail(data.showEmail ?? false);
          setShowStats(data.showStats ?? true);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };

    if (user) {
      void fetchProfile();
      void fetchUserStats();
    }
  }, [user, fetchUserStats]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    void fetchScanHistory();
  }, [user, navigate, fetchScanHistory]);

  useEffect(() => {
    if (!user || activeTab !== "data") {
      return;
    }
    void fetchScanHistory();
  }, [activeTab, user, fetchScanHistory]);

  const handleUpdateProfile = async () => {
    setProfileLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const updatePayload: Record<string, string | null> = {};
      const currentProfileName = profileData?.profileName || "";
      const currentFirstName = profileData?.firstName || "";
      const currentLastName = profileData?.lastName || "";
      const currentBio = profileData?.bio || "";

      if (profileName.trim() && profileName.trim() !== currentProfileName) {
        updatePayload.profileName = profileName.trim();
      }
      if (firstName !== currentFirstName) {
        updatePayload.firstName = firstName || null;
      }
      if (lastName !== currentLastName) {
        updatePayload.lastName = lastName || null;
      }
      if (bio !== currentBio) {
        updatePayload.bio = bio || null;
      }

      if (Object.keys(updatePayload).length === 0) {
        setMessage({ type: "success", text: "No profile changes to save" });
        setTimeout(() => setMessage(null), 3000);
        setProfileLoading(false);
        return;
      }

      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data.user);
        setMessage({ type: "success", text: "Profile updated successfully" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error("Failed to update profile");
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update profile" });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const passwordPolicyError = getPasswordPolicyError(newPassword);
    if (passwordPolicyError) {
      setMessage({ type: "error", text: passwordPolicyError });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Password changed successfully" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to change password");
      }
    } catch (error: unknown) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to change password",
      });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdateNotifications = async () => {
    if (notificationsLocked) {
      setMessage({
        type: "error",
        text: "Notification toggles are temporarily disabled.",
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setNotificationLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/profile/notifications", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailNotifications,
          scanAlerts,
          weeklyReports,
          marketingEmails,
        }),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Notification preferences updated",
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error("Failed to update notifications");
      }
    } catch {
      setMessage({
        type: "error",
        text: "Failed to update notification preferences",
      });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleUpdatePrivacy = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/profile/privacy", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileVisibility,
          showEmail,
          showStats,
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Privacy settings updated" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error("Failed to update privacy settings");
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update privacy settings" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Data export removed - users can manage data within the app only

  const handleDeleteScan = async (scanId: number) => {
    try {
      const authToken =
        token ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("authToken");
      if (!authToken) return;

      const response = await fetch(`/api/scan-history/${scanId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        setScanHistory((prev) => prev.filter((scan) => scan.id !== scanId));
        setMessage({ type: "success", text: "Scan deleted successfully" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error("Failed to delete scan");
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete scan" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleClearAllHistory = async () => {
    setClearHistoryLoading(true);
    try {
      const authToken =
        token ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("authToken");
      if (!authToken) return;

      const response = await fetch("/api/scan-history/clear-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        setScanHistory([]);
        setMessage({
          type: "success",
          text: "All scan history cleared successfully",
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error("Failed to clear history");
      }
    } catch {
      setMessage({ type: "error", text: "Failed to clear scan history" });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setClearHistoryLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        localStorage.removeItem("authToken");
        setMessage({
          type: "success",
          text: "Account deleted successfully. Redirecting...",
        });
        setTimeout(() => {
          logout();
          navigate("/");
        }, 2000);
      } else {
        throw new Error("Failed to delete account");
      }
    } catch {
      setMessage({
        type: "error",
        text: "Failed to delete account. Please try again.",
      });
      setDeleteLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleRevokeCookies = () => {
    clearCookieConsent();

    const consentWindow = window as ConsentWindow;
    if (typeof consentWindow.revokeAnalyticsConsent === "function") {
      consentWindow.revokeAnalyticsConsent();
    }

    setMessage({
      type: "success",
      text: "Analytics cookies revoked. You will be asked for consent again.",
    });
    setTimeout(() => setMessage(null), 3000);
  };

  if (!user) {
    return null;
  }

  const userIdentity = {
    profileName: profileName || user.profileName,
    fullName: user.fullName,
    email: user.email,
  };
  const displayName = getUserDisplayName(userIdentity);
  const avatarInitials = getUserInitials(userIdentity);
  const avatarSeed = encodeURIComponent(displayName);

  return (
    <>
      <SEOHead
        title={PAGE_META.accountSettings.title}
        description={PAGE_META.accountSettings.description}
        keywords={PAGE_META.accountSettings.keywords}
        noindex={PAGE_META.accountSettings.noindex}
      />
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Account Settings
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your account, profile, security, and preferences
            </p>
          </div>

          {/* Success/Error Messages */}
          {message && (
            <Alert
              className={`mb-6 ${message.type === "success" ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"}`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertDescription
                className={
                  message.type === "success"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {/* Profile Overview Card */}
          <Card className="mb-6 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-primary/20">
                    <AvatarImage
                      src={
                        user.avatarImagePath ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`
                      }
                      alt={displayName}
                    />
                    <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      {avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                  <Link to="/change-avatar">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    >
                      <Palette className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {/* User Info */}
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {displayName}
                  </h2>
                  <p className="text-muted-foreground flex items-center gap-2 justify-center md:justify-start">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </p>
                  {user.emailVerified ? (
                    <Badge className="mt-2 bg-green-500/10 text-green-500 border-green-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge className="mt-2 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Not Verified
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                {userStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {userStats.level}
                      </div>
                      <div className="text-xs text-muted-foreground">Level</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {userStats.totalScans}
                      </div>
                      <div className="text-xs text-muted-foreground">Scans</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-pink-400">
                        {userStats.totalDomains}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Domains
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-400">
                        {userStats.accountAge}
                      </div>
                      <div className="text-xs text-muted-foreground">Days</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                disabled={notificationsLocked}
                className={`gap-2 ${
                  notificationsLocked
                    ? "cursor-not-allowed opacity-50 data-[state=active]:bg-muted data-[state=active]:text-muted-foreground"
                    : ""
                }`}
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="gap-2">
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">Privacy</span>
              </TabsTrigger>
              <TabsTrigger value="data" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Data</span>
              </TabsTrigger>
              <TabsTrigger value="danger" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Danger</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and profile details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profileName">Username</Label>
                    <Input
                      id="profileName"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Enter your username"
                      maxLength={12}
                      pattern="[A-Za-z0-9]{3,12}"
                    />
                    <p className="text-xs text-muted-foreground">
                      3-12 chars, letters and numbers only
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      {bio.length}/500 characters
                    </p>
                  </div>
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={profileLoading}
                    className="w-full md:w-auto"
                  >
                    {profileLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Profile
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Avatar
                  </CardTitle>
                  <CardDescription>
                    Customize your profile avatar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/20">
                      <AvatarImage
                        src={
                          user.avatarImagePath ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`
                        }
                        alt={displayName}
                      />
                      <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {avatarInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-2">
                        Choose from 75+ unique avatars across 5 rarity tiers
                      </p>
                      <Link to="/change-avatar">
                        <Button variant="outline">
                          <Palette className="mr-2 h-4 w-4" />
                          Change Avatar
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Change Password
                  </CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Must be at least 8 characters and include uppercase,
                      lowercase, number, and symbol.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={
                      passwordLoading ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword
                    }
                    className="w-full md:w-auto"
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Change Password
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Account Security
                  </CardTitle>
                  <CardDescription>
                    Security status and recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {user.emailVerified ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium">Email Verification</p>
                        <p className="text-sm text-muted-foreground">
                          {user.emailVerified
                            ? "Your email is verified"
                            : "Please verify your email"}
                        </p>
                      </div>
                    </div>
                    {user.emailVerified ? (
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                        Verified
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline">
                        Verify Now
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Password Strength</p>
                        <p className="text-sm text-muted-foreground">
                          Your password is secure
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                      Strong
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Choose what emails you want to receive
                  </CardDescription>
                  {notificationsLocked && (
                    <p className="text-xs text-muted-foreground">
                      Notification preferences are temporarily disabled.
                    </p>
                  )}
                </CardHeader>
                <CardContent
                  className={`space-y-6 ${notificationsLocked ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications" className="text-base">
                        Email Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email notifications from us
                      </p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                      disabled={notificationsLocked}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="scanAlerts" className="text-base">
                        Scan Alerts
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when scans complete
                      </p>
                    </div>
                    <Switch
                      id="scanAlerts"
                      checked={scanAlerts}
                      onCheckedChange={setScanAlerts}
                      disabled={notificationsLocked || !emailNotifications}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="weeklyReports" className="text-base">
                        Weekly Reports
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive weekly summary of your activity
                      </p>
                    </div>
                    <Switch
                      id="weeklyReports"
                      checked={weeklyReports}
                      onCheckedChange={setWeeklyReports}
                      disabled={notificationsLocked || !emailNotifications}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="marketingEmails" className="text-base">
                        Marketing Emails
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about new features and offers
                      </p>
                    </div>
                    <Switch
                      id="marketingEmails"
                      checked={marketingEmails}
                      onCheckedChange={setMarketingEmails}
                      disabled={notificationsLocked || !emailNotifications}
                    />
                  </div>
                  <Button
                    onClick={handleUpdateNotifications}
                    disabled={notificationLoading || notificationsLocked}
                    className="w-full md:w-auto"
                  >
                    {notificationLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Preferences
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Privacy Settings
                  </CardTitle>
                  <CardDescription>
                    Control your profile statistics visibility
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="showStats" className="text-base">
                        Show Statistics
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Display your scan stats and level
                      </p>
                    </div>
                    <Switch
                      id="showStats"
                      checked={showStats}
                      onCheckedChange={setShowStats}
                    />
                  </div>
                  <Button
                    onClick={handleUpdatePrivacy}
                    className="w-full md:w-auto"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Privacy Settings
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Cookies & Tracking
                  </CardTitle>
                  <CardDescription>
                    Manage your cookie preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Analytics Cookies</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Revoke your consent for analytics cookies. You will be
                        asked for consent again on your next visit.
                      </p>
                      <Button variant="outline" onClick={handleRevokeCookies}>
                        Revoke Analytics Consent
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Tab */}
            <TabsContent value="data" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Scan History
                  </CardTitle>
                  <CardDescription>
                    Manage your domain scan history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : scanHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No scan history yet
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                        {scanHistory.slice(0, 10).map((scan) => (
                          <div
                            key={scan.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-sm">
                                {scan.domain}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(scan.createdAt).toLocaleDateString()}{" "}
                                - {scan.scanType}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteScan(scan.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-4" />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full"
                            disabled={clearHistoryLoading}
                          >
                            {clearHistoryLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Clear All Scan History
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Clear All Scan History?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete all your scan
                              history. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleClearAllHistory}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Clear All History
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Danger Zone Tab */}
            <TabsContent value="danger" className="space-y-6">
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible actions - proceed with caution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-4 border-destructive/50 bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-sm">
                      Deleting your account will permanently remove all your
                      data including:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Account information and credentials</li>
                        <li>All scan history and analytics</li>
                        <li>Claimed domains and favorites</li>
                        <li>Profile data and settings</li>
                        <li>Level progress and achievements</li>
                      </ul>
                      <strong className="block mt-2">
                        This action cannot be undone.
                      </strong>
                    </AlertDescription>
                  </Alert>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full"
                        disabled={deleteLoading}
                      >
                        {deleteLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete Account Permanently
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete your account and remove all your data from our
                          servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Yes, Delete My Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
