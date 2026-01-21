import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import supabase from "../config/Client";

function LoginPage() {
    const navigate = useNavigate();

    const [checkingSession, setCheckingSession] = useState(true);

    const [activeTab, setActiveTab] = useState("login");
    const [showLoginPw, setShowLoginPw] = useState(false);
    const [showRegPw, setShowRegPw] = useState(false);

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });

    const [loginForm, setLoginForm] = useState({ email: "", password: "" });
    const [regForm, setRegForm] = useState({
        fullname: "",
        phone: "",
        email: "",
        password: "",
        confirm: "",
        agree: false,
    });

    const setError = (text) => setMsg({ type: "error", text });
    const setSuccess = (text) => setMsg({ type: "success", text });

    async function upsertProfile(userId, fullname, phone) {
        const payload = {
            user_id: userId,
            full_name: fullname || "",
            phone: phone || "",
            notes: null,
        };

        const { error } = await supabase
            .from("profiles")
            .upsert(payload, { onConflict: "user_id" });

        if (error) throw error;
    }

    async function redirectByRole(userId) {
        // If you store admin flag in profiles.is_admin (boolean)
        const { data: prof, error } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("user_id", userId)
            .single();

        // If profiles row doesn't exist yet, treat as non-admin
        if (error) {
            navigate("/home", { replace: true });
            return;
        }

        if (prof?.is_admin) navigate("/admin/dashboard", { replace: true });
        else navigate("/home", { replace: true });
    }

    // ✅ Redirect if already logged in
    useEffect(() => {
        let mounted = true;

        const check = async () => {
            try {
                const { data } = await supabase.auth.getSession();
                if (!mounted) return;

                const user = data?.session?.user;
                if (user?.id) {
                    await redirectByRole(user.id);
                    return;
                }
            } finally {
                if (mounted) setCheckingSession(false);
            }
        };

        check();

        const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const user = session?.user;
            if (user?.id) {
                await redirectByRole(user.id);
            }
        });

        return () => {
            mounted = false;
            listener?.subscription?.unsubscribe();
        };
    }, [navigate]);

    const title = useMemo(
        () => (activeTab === "login" ? "Log in" : "Create account"),
        [activeTab]
    );

    const tabBtn = (isActive) =>
        [
            "relative pb-2 font-bold text-sm md:text-base",
            isActive
                ? "text-black after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-black"
                : "text-gray-500 hover:text-black",
        ].join(" ");

    const inputClass =
        "w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-black/20";

    // ✅ LOGIN
    async function onSubmitLogin(e) {
        e.preventDefault();
        setMsg({ type: "", text: "" });
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: loginForm.email,
                password: loginForm.password,
            });

            if (error) throw error;

            const u = data?.user;
            if (u?.id) {
                const metaName =
                    u.user_metadata?.full_name ||
                    u.user_metadata?.name ||
                    u.user_metadata?.fullname ||
                    "";

                const metaPhone = u.user_metadata?.phone || "";
                await upsertProfile(u.id, metaName, metaPhone);

                // ✅ Redirect admin -> /admin/dashboard
                await redirectByRole(u.id);
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Login failed.");
        } finally {
            setLoading(false);
        }
    }

    // ✅ REGISTER (same as yours; just change final redirect)
    async function onSubmitRegister(e) {
        e.preventDefault();
        setMsg({ type: "", text: "" });

        if (regForm.password !== regForm.confirm) return setError("Passwords do not match.");
        if (!regForm.agree) return setError("Please agree to the Terms.");

        setLoading(true);

        try {
            const emailRedirectTo = `${window.location.origin}/auth/callback`;

            const { data, error } = await supabase.auth.signUp({
                email: regForm.email,
                password: regForm.password,
                options: {
                    emailRedirectTo,
                    data: {
                        full_name: regForm.fullname,
                        phone: regForm.phone,
                    },
                },
            });

            if (error) throw error;

            if (!data.session) {
                setSuccess("Registered! Please check your email to confirm your account.");
                return;
            }

            if (data?.user?.id) {
                await upsertProfile(data.user.id, regForm.fullname, regForm.phone);
                await redirectByRole(data.user.id);
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Register failed.");
        } finally {
            setLoading(false);
        }
    }

    async function resendConfirmation() {
        setMsg({ type: "", text: "" });

        if (!regForm.email) {
            setError("Enter your email first (in the register email field).");
            return;
        }

        setLoading(true);
        try {
            const emailRedirectTo = `${window.location.origin}/auth/callback`;

            // Supabase v2:
            const { error } = await supabase.auth.resend({
                type: "signup",
                email: regForm.email,
                options: { emailRedirectTo },
            });

            if (error) throw error;

            setSuccess("Confirmation email sent. Please check your inbox/spam.");
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to resend confirmation email.");
        } finally {
            setLoading(false);
        }
    }

    // ... keep the rest of your JSX the same
    if (checkingSession) {
        return (
            <div className="min-h-screen grid place-items-center bg-white p-6">
                <div className="text-gray-700 font-semibold">Loading...</div>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-black/40 grid place-items-center p-4">
            <div className="w-full max-w-5xl bg-white rounded-xl overflow-hidden border border-gray-300 shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Left panel */}
                    <div className="relative min-h-65 md:min-h-full">
                        <div className="absolute inset-0 bg-[url('/pataXXL.jpg')] bg-cover bg-center" />
                        <div className="absolute inset-0 bg-linear-to-br from-black/80 via-black/60 to-black/80" />
                        <div className="absolute inset-0 [box-shadow:inset_0_0_120px_rgba(0,0,0,.7)]" />

                        <div className="relative p-6 md:p-9 text-white h-full flex flex-col">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide">
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                                    Open for orders today
                                </div>

                                <div className="mt-4 text-sm font-semibold tracking-wide text-white/90">
                                    Crispy Pata sa A.Luna
                                </div>

                                <h2 className="mt-2 text-3xl md:text-4xl font-extrabold leading-tight">
                                    {activeTab === "login" ? "Welcome back." : "Create your account."}
                                </h2>

                                <p className="mt-3 text-white/85 text-sm md:text-base max-w-md leading-relaxed">
                                    {activeTab === "login"
                                        ? "Log in to continue your order, save your details, and checkout faster."
                                        : "Sign up to save your details, track orders, and speed up checkout."}
                                </p>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-2">
                                <NavLink
                                    to="/menu"
                                    className="px-4 py-2 rounded-full bg-white text-black font-semibold hover:bg-white/90 active:scale-95 transition"
                                >
                                    Browse Menu
                                </NavLink>
                                <NavLink
                                    to="/"
                                    className="px-4 py-2 rounded-full border border-white/60 text-white font-semibold hover:bg-white/10 active:scale-95 transition"
                                >
                                    Back to Home
                                </NavLink>
                            </div>
                        </div>
                    </div>

                    {/* Right panel */}
                    <div className="p-6 md:p-8">
                        <div className="flex items-center gap-8 border-b border-gray-200 mb-6">
                            <button
                                type="button"
                                className={tabBtn(activeTab === "login")}
                                onClick={() => {
                                    setMsg({ type: "", text: "" });
                                    setActiveTab("login");
                                }}
                            >
                                Login
                            </button>

                            <button
                                type="button"
                                className={tabBtn(activeTab === "register")}
                                onClick={() => {
                                    setMsg({ type: "", text: "" });
                                    setActiveTab("register");
                                }}
                            >
                                Register
                            </button>
                        </div>

                        <div className="mb-5">
                            <h1 className="text-2xl font-bold">{title}</h1>
                            <p className="text-gray-600 text-sm mt-1">
                                {activeTab === "login"
                                    ? "Enter your details to log in."
                                    : "Fill up the form to create your account."}
                            </p>
                        </div>

                        {msg.text && (
                            <div
                                className={[
                                    "mb-4 rounded-md border p-3 text-sm",
                                    msg.type === "error"
                                        ? "border-red-300 bg-red-50 text-red-700"
                                        : "border-green-300 bg-green-50 text-green-700",
                                ].join(" ")}
                            >
                                {msg.text}
                            </div>
                        )}

                        {/* LOGIN */}
                        {activeTab === "login" && (
                            <form onSubmit={onSubmitLogin} className="flex flex-col gap-4">
                                <div>
                                    <label className="text-sm font-semibold">Email</label>
                                    <input
                                        className={inputClass}
                                        type="email"
                                        placeholder="Email"
                                        autoComplete="email"
                                        required
                                        value={loginForm.email}
                                        onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold">Password</label>
                                    <div className="relative">
                                        <input
                                            className={`${inputClass} pr-16`}
                                            type={showLoginPw ? "text" : "password"}
                                            placeholder="Password"
                                            autoComplete="current-password"
                                            required
                                            value={loginForm.password}
                                            onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowLoginPw((v) => !v)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-700 hover:text-black"
                                        >
                                            {showLoginPw ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                    <NavLink
                                        to="/forgot-password"
                                        className="text-sm font-semibold text-black hover:underline text-left"
                                    >
                                        Forgot password?
                                    </NavLink>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-1 px-4 py-2.5 rounded-full bg-black text-white font-semibold hover:bg-neutral-800 active:scale-95 transition disabled:opacity-60"
                                >
                                    {loading ? "Logging in..." : "Login"}
                                </button>
                            </form>
                        )}

                        {/* REGISTER */}
                        {activeTab === "register" && (
                            <form onSubmit={onSubmitRegister} className="flex flex-col gap-4">
                                <div>
                                    <label className="text-sm font-semibold">Full name</label>
                                    <input
                                        className={inputClass}
                                        type="text"
                                        placeholder="Full name"
                                        required
                                        value={regForm.fullname}
                                        onChange={(e) => setRegForm((p) => ({ ...p, fullname: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold">Phone number</label>
                                    <input
                                        className={inputClass}
                                        type="tel"
                                        placeholder="09XXXXXXXXX"
                                        autoComplete="tel"
                                        required
                                        value={regForm.phone}
                                        onChange={(e) => setRegForm((p) => ({ ...p, phone: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold">Email</label>
                                    <input
                                        className={inputClass}
                                        type="email"
                                        placeholder="Email"
                                        autoComplete="email"
                                        required
                                        value={regForm.email}
                                        onChange={(e) => setRegForm((p) => ({ ...p, email: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold">Password</label>
                                    <div className="relative">
                                        <input
                                            className={`${inputClass} pr-16`}
                                            type={showRegPw ? "text" : "password"}
                                            placeholder="Password"
                                            autoComplete="new-password"
                                            required
                                            value={regForm.password}
                                            onChange={(e) => setRegForm((p) => ({ ...p, password: e.target.value }))}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowRegPw((v) => !v)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-700 hover:text-black"
                                        >
                                            {showRegPw ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold">Confirm password</label>
                                    <input
                                        className={inputClass}
                                        type={showRegPw ? "text" : "password"}
                                        placeholder="Confirm password"
                                        autoComplete="new-password"
                                        required
                                        value={regForm.confirm}
                                        onChange={(e) => setRegForm((p) => ({ ...p, confirm: e.target.value }))}
                                    />
                                </div>

                                <label className="flex items-start gap-2 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        className="accent-black mt-1"
                                        checked={regForm.agree}
                                        onChange={(e) => setRegForm((p) => ({ ...p, agree: e.target.checked }))}
                                        required
                                    />
                                    <span>
                                        I agree to the{" "}
                                        <button
                                            type="button"
                                            className="font-semibold text-black hover:underline"
                                            onClick={() => alert("Open Terms page/modal here")}
                                        >
                                            Terms
                                        </button>
                                    </span>
                                </label>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-1 px-4 py-2.5 rounded-full bg-black text-white font-semibold hover:bg-neutral-800 active:scale-95 transition disabled:opacity-60"
                                >
                                    {loading ? "Registering..." : "Register"}
                                </button>

                                <button
                                    type="button"
                                    onClick={resendConfirmation}
                                    disabled={loading}
                                    className="text-sm font-semibold text-black hover:underline text-left disabled:opacity-60"
                                >
                                    Resend confirmation email
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
