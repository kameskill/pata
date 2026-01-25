// ✅ LoginPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import supabase from "../config/Client";

function LoginPage() {
    const navigate = useNavigate();

    // "checking" -> initial check
    // "redirecting" -> user already logged in, we are navigating away
    // "ready" -> show login/register UI
    const [pageState, setPageState] = useState("checking");

    const [activeTab, setActiveTab] = useState("login");
    const [showLoginPw, setShowLoginPw] = useState(false);
    const [showRegPw, setShowRegPw] = useState(false);

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });

    const [loginForm, setLoginForm] = useState({ email: "", password: "" });

    const [regForm, setRegForm] = useState({
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        password: "",
        confirm: "",
        agree: false,
    });

    const setError = (text) => setMsg({ type: "error", text });
    const setSuccess = (text) => setMsg({ type: "success", text });

    const isValidEmail = (email) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());

    const cleanPhoneDigits = (v) => String(v || "").replace(/\D/g, "").slice(0, 11);
    const isValidPHPhone11 = (v) => /^\d{11}$/.test(String(v || ""));

    const fullNameFromReg = useMemo(() => {
        const fn = regForm.first_name.trim();
        const ln = regForm.last_name.trim();
        return [fn, ln].filter(Boolean).join(" ");
    }, [regForm.first_name, regForm.last_name]);

    const isEmailAlreadyRegisteredError = (err) => {
        const m = String(err?.message || "").toLowerCase();
        return (
            m.includes("already registered") ||
            m.includes("already exists") ||
            m.includes("user already") ||
            m.includes("email already") ||
            m.includes("duplicate") ||
            m.includes("unique constraint") ||
            m.includes("duplicate key")
        );
    };

    async function upsertProfile(userId, firstName, lastName, phone) {
        const full_name = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ").trim();

        const payload = {
            user_id: userId,
            first_name: firstName?.trim() || "",
            last_name: lastName?.trim() || "",
            full_name: full_name || "",
            phone: phone || "",
            notes: null,
        };

        const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
        if (error) throw error;
    }

    // ✅ safer redirect: if profile fetch fails/slow, fallback to /home
    async function redirectByRoleSafe(userId) {
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("role-timeout")), 4000)
        );

        try {
            const roleFetch = supabase
                .from("profiles")
                .select("is_admin")
                .eq("user_id", userId)
                .single();

            const { data: prof } = await Promise.race([roleFetch, timeout]);

            if (prof?.is_admin) navigate("/admin/dashboard", { replace: true });
            else navigate("/home", { replace: true });
        } catch (e) {
            navigate("/home", { replace: true });
        }
    }

    // ✅ Redirect if already logged in (no infinite loading)
    useEffect(() => {
        let alive = true;

        const go = async (userId) => {
            if (!alive) return;

            // stop the "Loading..." screen immediately
            setPageState("redirecting");

            // don't block UI waiting for role query
            redirectByRoleSafe(userId);
        };

        const check = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (!alive) return;

                if (error) {
                    setPageState("ready");
                    return;
                }

                const userId = data?.session?.user?.id;
                if (userId) {
                    go(userId);
                    return;
                }

                setPageState("ready");
            } catch {
                if (alive) setPageState("ready");
            }
        };

        check();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            const userId = session?.user?.id;
            if (userId) go(userId);
        });

        return () => {
            alive = false;
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
            const email = loginForm.email.trim();
            if (!isValidEmail(email)) throw new Error("Please enter a valid email (must include @).");

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password: loginForm.password,
            });

            if (error) throw error;

            const u = data?.user;
            if (u?.id) {
                const metaFirst =
                    u.user_metadata?.first_name ||
                    (u.user_metadata?.full_name || "").split(" ").slice(0, -1).join(" ") ||
                    "";
                const metaLast =
                    u.user_metadata?.last_name ||
                    (u.user_metadata?.full_name || "").split(" ").slice(-1).join(" ") ||
                    "";
                const metaPhone = u.user_metadata?.phone || "";

                await upsertProfile(u.id, metaFirst, metaLast, metaPhone);

                setPageState("redirecting");
                redirectByRoleSafe(u.id);
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Login failed.");
        } finally {
            setLoading(false);
        }
    }

    // ✅ REGISTER
    async function onSubmitRegister(e) {
        e.preventDefault();
        setMsg({ type: "", text: "" });

        const first = regForm.first_name.trim();
        const last = regForm.last_name.trim();
        const email = regForm.email.trim();
        const phone = cleanPhoneDigits(regForm.phone);

        if (!first) return setError("First name is required.");
        if (!last) return setError("Last name is required.");
        if (!isValidEmail(email)) return setError("Please enter a valid email (must include @).");
        if (!isValidPHPhone11(phone)) return setError("Phone must be exactly 11 digits (numbers only).");
        if (regForm.password !== regForm.confirm) return setError("Passwords do not match.");
        if (!regForm.agree) return setError("Please agree to the Terms.");

        setLoading(true);

        try {
            const emailRedirectTo = `${window.location.origin}/auth/callback`;

            const { data, error } = await supabase.auth.signUp({
                email,
                password: regForm.password,
                options: {
                    emailRedirectTo,
                    data: {
                        first_name: first,
                        last_name: last,
                        full_name: `${first} ${last}`,
                        phone,
                    },
                },
            });

            if (error) {
                if (isEmailAlreadyRegisteredError(error)) {
                    setError("Email is already registered. Please log in instead.");
                    setActiveTab("login");
                    setLoginForm((p) => ({ ...p, email }));
                    return;
                }
                throw error;
            }

            if (!data.session) {
                setSuccess("Registered! Please check your email to confirm your account.");
                return;
            }

            if (data?.user?.id) {
                await upsertProfile(data.user.id, first, last, phone);
                setPageState("redirecting");
                redirectByRoleSafe(data.user.id);
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

            const { error } = await supabase.auth.resend({
                type: "signup",
                email: regForm.email.trim(),
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

    if (pageState === "checking") {
        return (
            <div className="min-h-screen grid place-items-center bg-white p-6">
                <div className="text-gray-700 font-semibold">Loading...</div>
            </div>
        );
    }

    if (pageState === "redirecting") {
        return (
            <div className="min-h-screen grid place-items-center bg-white p-6">
                <div className="text-gray-700 font-semibold">Redirecting...</div>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-semibold">First name</label>
                                        <input
                                            className={inputClass}
                                            type="text"
                                            placeholder="Juan"
                                            required
                                            value={regForm.first_name}
                                            onChange={(e) => setRegForm((p) => ({ ...p, first_name: e.target.value }))}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-semibold">Last name</label>
                                        <input
                                            className={inputClass}
                                            type="text"
                                            placeholder="Dela Cruz"
                                            required
                                            value={regForm.last_name}
                                            onChange={(e) => setRegForm((p) => ({ ...p, last_name: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold">Phone number</label>
                                    <input
                                        className={inputClass}
                                        type="tel"
                                        placeholder="09XXXXXXXXX"
                                        inputMode="numeric"
                                        pattern="\d{11}"
                                        maxLength={11}
                                        required
                                        value={regForm.phone}
                                        onChange={(e) => {
                                            const digits = cleanPhoneDigits(e.target.value);
                                            setRegForm((p) => ({ ...p, phone: digits }));
                                        }}
                                    />
                                    <div className="text-xs text-gray-500 mt-1">
                                        Must be exactly 11 digits (numbers only).
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold">Email</label>
                                    <input
                                        className={inputClass}
                                        type="email"
                                        placeholder="example@gmail.com"
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
                                    type="button"
                                    onClick={resendConfirmation}
                                    disabled={loading}
                                    className="text-sm font-semibold text-black hover:underline text-left disabled:opacity-60"
                                >
                                    Resend confirmation email
                                </button>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-1 px-4 py-2.5 rounded-full bg-black text-white font-semibold hover:bg-neutral-800 active:scale-95 transition disabled:opacity-60"
                                >
                                    {loading ? "Registering..." : "Register"}
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
