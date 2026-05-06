import type { AppLanguage } from "@/lib/server/advisor-schemas";

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: "English",
  hi: "Hindi",
  hinglish: "Hinglish",
  ta: "Tamil",
  te: "Telugu",
};

export const APP_COPY: Record<
  AppLanguage,
  {
    tagline: string;
    nav: {
      home: string;
      fds: string;
      compare: string;
      insights: string;
      chat: string;
      voice: string;
      login: string;
      logout: string;
      profile: string;
    };
    auth: {
      title: string;
      subtitle: string;
      phoneLabel: string;
      sendOtp: string;
      otpLabel: string;
      verifyOtp: string;
      signOut: string;
    };
    compare: {
      title: string;
      subtitle: string;
      shortlist: string;
      askSaathi: string;
      emptyTitle: string;
      emptyBody: string;
      stickyTitle: string;
      stickyCta: string;
    };
    voice: {
      title: string;
      subtitle: string;
      send: string;
    };
  }
> = {
  en: {
    tagline: "Your trusted FD guide",
    nav: {
      home: "Home",
      compare: "Compare",
      fds: "Dashboard",
      insights: "Insights",
      chat: "Chat",
      voice: "Voice",
      login: "Sign in",
      logout: "Sign out",
      profile: "Profile",
    },
    auth: {
      title: "Secure your shortlist",
      subtitle: "Sign in with your phone to save rates and continue across devices.",
      phoneLabel: "Phone number",
      sendOtp: "Send OTP",
      otpLabel: "OTP",
      verifyOtp: "Verify OTP",
      signOut: "Sign out",
    },
    compare: {
      title: "Compare FD options clearly",
      subtitle: "Filter, shortlist, then ask Saathi what really changes your return.",
      shortlist: "Shortlist",
      askSaathi: "Ask Saathi",
      emptyTitle: "No rate matched that combination",
      emptyBody: "Try another amount, a broader tenure, or switch the bank category.",
      stickyTitle: "Ready to compare your shortlist with Saathi?",
      stickyCta: "Open chat",
    },
    voice: {
      title: "Saathi Advisor",
      subtitle: "Type or speak in the same secure conversation.",
      send: "Send",
    },
  },
  hi: {
    tagline: "Aapka bharosemand FD guide",
    nav: {
      home: "Home",
      compare: "Compare",
      fds: "Dashboard",
      insights: "Insights",
      chat: "Chat",
      voice: "Voice",
      login: "Sign in",
      logout: "Sign out",
      profile: "Profile",
    },
    auth: {
      title: "Apni shortlist surakshit rakhiye",
      subtitle: "Phone se sign in karke rates save kijiye aur baad mein wahi se continue kijiye.",
      phoneLabel: "Phone number",
      sendOtp: "OTP bhejiye",
      otpLabel: "OTP",
      verifyOtp: "OTP verify kijiye",
      signOut: "Sign out",
    },
    compare: {
      title: "FD options seedhe compare kijiye",
      subtitle: "Filter kijiye, shortlist banaiye, phir Saathi se poochhiye kya farq padta hai.",
      shortlist: "Shortlist",
      askSaathi: "Saathi se poochhiye",
      emptyTitle: "Is filter ke liye rate nahin mila",
      emptyBody: "Rashi, tenure ya bank category badal kar dekhiye.",
      stickyTitle: "Ab shortlist ko Saathi ke saath compare karna hai?",
      stickyCta: "Chat kholo",
    },
    voice: {
      title: "Saathi Advisor",
      subtitle: "Ek hi secure conversation mein type ya mic se poochhiye.",
      send: "Send",
    },
  },
  hinglish: {
    tagline: "Aapka trusted FD guide",
    nav: {
      home: "Home",
      compare: "Compare",
      fds: "Dashboard",
      insights: "Insights",
      chat: "Chat",
      voice: "Voice",
      login: "Sign in",
      logout: "Sign out",
      profile: "Profile",
    },
    auth: {
      title: "Apni shortlist safe rakhiye",
      subtitle: "Sign in karke rates save kijiye aur baad mein continue kijiye.",
      phoneLabel: "Phone number",
      sendOtp: "OTP bhejiye",
      otpLabel: "OTP",
      verifyOtp: "OTP verify kijiye",
      signOut: "Sign out",
    },
    compare: {
      title: "FD options clearly compare kijiye",
      subtitle: "Filter kijiye, shortlist banaiye, phir Saathi se simple advice lijiye.",
      shortlist: "Shortlist",
      askSaathi: "Saathi se poochhiye",
      emptyTitle: "Is filter ke liye rate nahi mila",
      emptyBody: "Amount, tenure, ya bank type change karke dekhiye.",
      stickyTitle: "Shortlist ko Saathi ke saath compare karna hai?",
      stickyCta: "Chat kholo",
    },
    voice: {
      title: "Saathi Voice Call",
      subtitle: "English, Hindi ya Hinglish mein bolkar FD compare aur book kijiye.",
      send: "Send",
    },
  },
  ta: {
    tagline: "Ungal nambikkaiyana FD guide",
    nav: {
      home: "Home",
      compare: "Compare",
      fds: "Dashboard",
      insights: "Insights",
      chat: "Chat",
      voice: "Voice",
      login: "Sign in",
      logout: "Sign out",
      profile: "Profile",
    },
    auth: {
      title: "Ungal shortlist-ai kaappom",
      subtitle: "Phone sign in moolam rates save pannitu appuramum continue pannalaam.",
      phoneLabel: "Phone number",
      sendOtp: "OTP anuppu",
      otpLabel: "OTP",
      verifyOtp: "OTP urudhi seyyu",
      signOut: "Sign out",
    },
    compare: {
      title: "FD options-ai thelivaga compare pannunga",
      subtitle: "Filter pannunga, shortlist seyyunga, apram Saathi kitte vivaram ketkalaam.",
      shortlist: "Shortlist",
      askSaathi: "Saathi-ai kelunga",
      emptyTitle: "Indha filter-kku porundhiya rate illai",
      emptyBody: "Thogai, tenure allathu bank category-ai maattri paarunga.",
      stickyTitle: "Shortlist-ai Saathi-oda discuss panna ready-aa?",
      stickyCta: "Chat thirakkavum",
    },
    voice: {
      title: "Saathi Advisor",
      subtitle: "Orey secure conversation-il type allathu mic use pannunga.",
      send: "Send",
    },
  },
  te: {
    tagline: "Mee nammakamaina FD guide",
    nav: {
      home: "Home",
      compare: "Compare",
      fds: "Dashboard",
      insights: "Insights",
      chat: "Chat",
      voice: "Voice",
      login: "Sign in",
      logout: "Sign out",
      profile: "Profile",
    },
    auth: {
      title: "Mee shortlist secure ga unchandi",
      subtitle: "Phone tho sign in chesi rates save cheskoni taruvata continue cheyyandi.",
      phoneLabel: "Phone number",
      sendOtp: "OTP pampandi",
      otpLabel: "OTP",
      verifyOtp: "OTP verify cheyyandi",
      signOut: "Sign out",
    },
    compare: {
      title: "FD options ni easy ga compare cheyyandi",
      subtitle: "Filter cheyyandi, shortlist create cheyyandi, taruvata Saathi ni adugandi.",
      shortlist: "Shortlist",
      askSaathi: "Saathi ni adugandi",
      emptyTitle: "Ee filter ki rate dorakaledu",
      emptyBody: "Amount, tenure, leka bank category marchi chudandi.",
      stickyTitle: "Shortlist ni Saathi tho discuss cheyyala?",
      stickyCta: "Chat open cheyyandi",
    },
    voice: {
      title: "Saathi Advisor",
      subtitle: "Oke secure conversation lo type cheyyandi leka mic use cheyyandi.",
      send: "Send",
    },
  },
};
