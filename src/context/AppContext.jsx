import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase, BUCKET_NAME } from "../lib/supabaseClient.js";
import { mapRow, sanitizeFilename } from "../lib/format.js";
import { DEFAULT_CATS } from "../lib/colors.js";
import {
  LOGIN_EMAIL_DOMAIN,
  emailToUsername,
  usernameToEmail,
} from "../lib/username.js";

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp precisa ser usado dentro de <AppProvider>");
  return ctx;
}

export function AppProvider({ children }) {
  const [faqs, setFaqs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [theme, setTheme] = useState(
    () =>
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("kb-theme")) ||
      "dark",
  );
  const [toastData, setToastData] = useState({ msg: "", color: "#4dab8c" });
  const [toastVisible, setToastVisible] = useState(false);
  const [authModal, setAuthModal] = useState({ open: false, mode: "signin" });
  const [faqModal, setFaqModal] = useState({ open: false, editingId: null });
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    targetId: null,
  });
  const [usersModal, setUsersModal] = useState(false);
  const [logsModal, setLogsModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Recolhimento da barra lateral no desktop (no mobile, quem manda é
  // sidebarOpen). Persistido para lembrar a preferência entre visitas.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () =>
      typeof localStorage !== "undefined" &&
      localStorage.getItem("kb-sidebar-collapsed") === "1",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [currentCat, setCurrentCat] = useState("Todas");
  const [currentSort, setCurrentSort] = useState("recentes");
  // Categorias fixas que o Admin excluiu, persistidas em public.kb_settings.
  const [hiddenCats, setHiddenCats] = useState([]);
  // Mapa nome->cor das categorias, persistido em public.kb_category_colors.
  const [catColors, setCatColors] = useState({});

  const toastTimer = useRef(null);
  const faqsRef = useRef(faqs);
  faqsRef.current = faqs;

  const showToast = useCallback((msg, color = "#4dab8c") => {
    clearTimeout(toastTimer.current);
    setToastData({ msg, color });
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2400);
  }, []);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        "kb-sidebar-collapsed",
        sidebarCollapsed ? "1" : "0",
      );
    }
  }, [sidebarCollapsed]);

  const loadFaqs = useCallback(async () => {
    const { data, error } = await supabase
      .from("faqs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setIsLoading(false);
      showToast(
        "Erro ao carregar do banco — confira a configuração e as políticas de RLS",
        "#e0554a",
      );
      return;
    }
    setFaqs(data.map(mapRow));
    setIsLoading(false);
  }, [showToast]);

  const loadHiddenCats = useCallback(async () => {
    // A tabela pode não existir ainda (setup-categories.sql não rodado). Nesse
    // caso, apenas seguimos sem categorias ocultas — sem quebrar o app.
    const { data, error } = await supabase
      .from("kb_settings")
      .select("value")
      .eq("key", "hidden_categories")
      .maybeSingle();
    if (error) return;
    const list = data?.value;
    if (Array.isArray(list)) setHiddenCats(list);
  }, []);

  const loadCategoryColors = useCallback(async () => {
    // Tabela opcional: se não existir, seguimos com as cores automáticas.
    const { data, error } = await supabase
      .from("kb_category_colors")
      .select("name, color");
    if (error) return;
    const map = {};
    (data || []).forEach((r) => {
      if (r.name && r.color) map[r.name] = r.color;
    });
    setCatColors(map);
  }, []);

  useEffect(() => {
    let subscription;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setCurrentUser(sessionData?.session?.user || null);
      const { data: sub } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setCurrentUser(session?.user || null);
        },
      );
      subscription = sub?.subscription;
    })();
    loadFaqs();
    loadHiddenCats();
    loadCategoryColors();
    return () => subscription?.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carrega o perfil (nome de exibição, papel e a flag de troca de senha) da
  // pessoa logada. Fica num useCallback porque precisamos relê-lo depois da
  // troca de senha, para o modal bloqueante sair da tela.
  const loadProfile = useCallback(async () => {
    if (!currentUser) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, name, role, must_change_password")
      .eq("id", currentUser.id)
      .maybeSingle();
    if (error) {
      console.error("Erro ao carregar o perfil:", error);
      setProfile(null);
      return;
    }
    setProfile(data || null);
  }, [currentUser]);

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadProfile();
      if (!alive) return;
    })();
    return () => {
      alive = false;
    };
  }, [loadProfile]);

  const isAdmin = profile?.role === "admin";
  // Só faz sentido cobrar a troca de quem já tem perfil carregado: enquanto
  // ele não chega, `profile` é null e a tela não pisca o modal à toa.
  const mustChangePassword = !!profile?.must_change_password;
  const displayName =
    profile?.name ||
    currentUser?.user_metadata?.name ||
    emailToUsername(currentUser?.email) ||
    null;

  useEffect(() => {
    document.body.classList.toggle("light", theme === "light");
    localStorage.setItem("kb-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  const requireAuth = useCallback(
    (msg) => {
      if (currentUser) return true;
      showToast(msg || "Entre com sua conta para continuar", "#e0554a");
      setAuthModal({ open: true, mode: "signin" });
      return false;
    },
    [currentUser, showToast],
  );

  // ── autenticação ──
  //
  // Aceita as duas formas: se o que a pessoa digitou tem "@", vale como
  // e-mail; se não tem, é um nome de usuário e o e-mail interno é montado
  // aqui (o caso da conta do Admin).
  const signIn = useCallback(
    async (identifier, password) => {
      const email = usernameToEmail(identifier);
      if (!email) throw new Error("Informe o seu e-mail ou usuário.");
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (/invalid login credentials/i.test(error.message)) {
          throw new Error("E-mail/usuário ou senha incorretos.");
        }
        throw error;
      }
      setAuthModal({ open: false, mode: "signin" });
      showToast("Login realizado", "#4dab8c");
    },
    [showToast],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUsersModal(false);
    setLogsModal(false);
    showToast("Você saiu da conta", "#9b9a97");
  }, [showToast]);

  // ── gerenciamento de usuários (só Admin) ──
  //
  // Tudo passa pela Edge Function `admin-users`: criar e excluir contas exige
  // a chave service_role, que jamais pode ficar no front-end. A função ainda
  // revalida no servidor se quem chamou é realmente Admin.
  const adminUsers = useCallback(async (action, payload = {}) => {
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action, ...payload, domain: LOGIN_EMAIL_DOMAIN },
    });
    if (error) {
      let msg = "";
      try {
        const detail = await error.context?.json();
        msg = detail?.error || "";
      } catch {
        // resposta sem corpo JSON — usa a mensagem genérica abaixo
      }
      throw new Error(
        msg || "Não foi possível falar com o servidor de usuários.",
      );
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  // Troca da própria senha. Passa pela mesma Edge Function, mas por uma ação
  // que não exige ser Admin — ela age apenas sobre quem chamou. O id nunca
  // viaja no corpo, justamente para não virar um jeito de mexer na conta
  // alheia caso a checagem de papel mude no futuro.
  const changeOwnPassword = useCallback(
    async (password, current) => {
      await adminUsers("self-password", { password, current });
      await loadProfile();
    },
    [adminUsers, loadProfile],
  );

  // ── registro de atividade (só Admin) ──
  //
  // A leitura é direta na tabela: o RLS já limita ao Admin, então não há
  // motivo para passar pela Edge Function. `offset` serve ao "carregar mais".
  const loadActivityLog = useCallback(
    async ({ offset = 0, limit = 50 } = {}) => {
      const { data, error } = await supabase
        .from("activity_log")
        .select(
          "id, created_at, actor_name, action, entity_type, entity_id, entity_label, details",
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) {
        // A tabela pode não existir ainda (fix-02 não rodado).
        throw new Error(
          "Não foi possível ler o registro de atividade — confira se o fix-02-senha-e-logs.sql foi executado.",
        );
      }
      return data || [];
    },
    [],
  );

  // ── mutações de FAQ ──
  const toggleStar = useCallback(
    async (id) => {
      if (!requireAuth("Entre para favoritar")) return;
      const target = faqsRef.current.find((f) => f.id === id);
      if (!target) return;
      const newVal = !target.starred;
      setFaqs((prev) =>
        prev.map((f) => (f.id === id ? { ...f, starred: newVal } : f)),
      );
      showToast(
        newVal ? "Adicionado aos favoritos" : "Removido dos favoritos",
        newVal ? "#dfab01" : "#9b9a97",
      );
      const { error } = await supabase
        .from("faqs")
        .update({ starred: newVal })
        .eq("id", id);
      if (error) {
        setFaqs((prev) =>
          prev.map((f) => (f.id === id ? { ...f, starred: !newVal } : f)),
        );
        showToast("Erro ao salvar", "#e0554a");
      }
    },
    [requireAuth, showToast],
  );

  const togglePin = useCallback(
    async (id) => {
      if (!requireAuth("Entre para fixar")) return;
      const target = faqsRef.current.find((f) => f.id === id);
      if (!target) return;
      const newVal = !target.pinned;
      setFaqs((prev) =>
        prev.map((f) => (f.id === id ? { ...f, pinned: newVal } : f)),
      );
      showToast(
        newVal ? "FAQ fixada" : "FAQ desafixada",
        newVal ? "#529cca" : "#9b9a97",
      );
      const { error } = await supabase
        .from("faqs")
        .update({ pinned: newVal })
        .eq("id", id);
      if (error) {
        setFaqs((prev) =>
          prev.map((f) => (f.id === id ? { ...f, pinned: !newVal } : f)),
        );
        showToast("Erro ao salvar", "#e0554a");
      }
    },
    [requireAuth, showToast],
  );

  // Incrementa via função RPC (increment_faq_views, criada no setup.sql):
  //  - é atômica no banco (views = views + 1), então dois leitores simultâneos
  //    não sobrescrevem o contador um do outro;
  //  - roda como SECURITY DEFINER, então funciona também para quem está lendo
  //    a base sem login — um UPDATE direto era barrado pelo RLS e o número
  //    subia só na tela, sem nunca ser salvo.
  const incrementViews = useCallback(async (id) => {
    const target = faqsRef.current.find((f) => f.id === id);
    if (!target) return;
    setFaqs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, views: f.views + 1 } : f)),
    );
    const { data, error } = await supabase.rpc("increment_faq_views", {
      faq_id: id,
    });
    if (error) {
      console.error("Erro ao registrar visualização:", error);
      setFaqs((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, views: Math.max(0, f.views - 1) } : f,
        ),
      );
      return;
    }
    // A função devolve o total já gravado; sincroniza a tela com o banco.
    if (typeof data === "number") {
      setFaqs((prev) =>
        prev.map((f) => (f.id === id ? { ...f, views: data } : f)),
      );
    }
  }, []);

  const saveFaq = useCallback(
    async ({
      editingId,
      title,
      question,
      body,
      cat,
      tags,
      pinned,
      attachments,
    }) => {
      const authorName = displayName || "Você";
      if (editingId) {
        const { error } = await supabase
          .from("faqs")
          .update({ title, question, body, cat, tags, pinned, attachments })
          .eq("id", editingId);
        if (error) throw error;
        await loadFaqs();
      } else {
        const { error } = await supabase.from("faqs").insert({
          title,
          question,
          body,
          cat,
          tags,
          author: authorName,
          author_id: currentUser?.id || null,
          starred: false,
          pinned,
          views: 0,
          attachments,
        });
        if (error) throw error;
        await loadFaqs();
      }
    },
    [currentUser, displayName, loadFaqs],
  );

  const deleteFaq = useCallback(
    async (id) => {
      const target = faqsRef.current.find((f) => f.id === id);
      const { error } = await supabase.from("faqs").delete().eq("id", id);
      if (error) throw error;
      if (target?.attachments?.length) {
        const paths = target.attachments.map((a) => a.path).filter(Boolean);
        if (paths.length)
          supabase.storage
            .from(BUCKET_NAME)
            .remove(paths)
            .catch(() => {});
      }
      await loadFaqs();
    },
    [loadFaqs],
  );

  // Exclui uma categoria movendo todas as FAQs dela para "Sem categoria"
  // (cat = ''). Nada é apagado. Se a categoria for uma das fixas, o nome é
  // guardado em kb_settings para não voltar a ser sugerido.
  const deleteCategory = useCallback(
    async (cat) => {
      if (!cat) return;
      const { error } = await supabase
        .from("faqs")
        .update({ cat: "" })
        .eq("cat", cat);
      if (error) throw error;

      if (DEFAULT_CATS.includes(cat)) {
        const next = Array.from(new Set([...hiddenCats, cat]));
        const { error: sErr } = await supabase
          .from("kb_settings")
          .upsert(
            { key: "hidden_categories", value: next },
            { onConflict: "key" },
          );
        // Se a tabela de settings não existir, a categoria fixa vai reaparecer
        // no próximo carregamento — avisamos quem chamou para orientar o setup.
        if (sErr) throw new Error("SETTINGS_TABLE_MISSING");
        setHiddenCats(next);
      }

      await loadFaqs();
    },
    [hiddenCats, loadFaqs],
  );

  // Guarda (ou atualiza) a cor de uma categoria. Atualiza o estado local
  // otimisticamente para a cor aparecer na hora. Se a tabela não existir,
  // a categoria simplesmente usa a cor automática.
  const saveCategoryColor = useCallback(async (name, color) => {
    if (!name || !color) return;
    setCatColors((prev) => ({ ...prev, [name]: color }));
    const { error } = await supabase
      .from("kb_category_colors")
      .upsert({ name, color }, { onConflict: "name" });
    if (error) console.error(error);
  }, []);

  const uploadFile = useCallback(async (file, folder = "files") => {
    const path = `${folder}/${Date.now()}-${sanitizeFilename(file.name)}`;
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return { url: data.publicUrl, path };
  }, []);

  const removeUploadedFile = useCallback((path) => {
    if (path)
      supabase.storage
        .from(BUCKET_NAME)
        .remove([path])
        .catch(() => {});
  }, []);

  const exportJson = useCallback(() => {
    const data = JSON.stringify(faqsRef.current, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `base-de-conhecimento-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Exportação gerada", "#4dab8c");
  }, [showToast]);

  const importJson = useCallback(
    async (file) => {
      try {
        const text = await file.text();
        const items = JSON.parse(text);
        if (!Array.isArray(items)) throw new Error("formato inválido");
        const rows = items.map((f) => ({
          title: f.title || "Sem título",
          question: f.question || "",
          body: f.body || "",
          cat: f.cat || "Geral",
          tags: f.tags || [],
          author: f.author || displayName || "Importado",
          views: f.views || 0,
          starred: !!f.starred,
          pinned: !!f.pinned,
          attachments: f.attachments || [],
        }));
        const { error } = await supabase.from("faqs").insert(rows);
        if (error) throw error;
        showToast(`${rows.length} FAQ(s) importada(s)`, "#4dab8c");
        await loadFaqs();
      } catch (err) {
        console.error(err);
        showToast("Erro ao importar o arquivo", "#e0554a");
      }
    },
    [displayName, loadFaqs, showToast],
  );

  const value = {
    faqs,
    isLoading,
    currentUser,
    profile,
    isAdmin,
    mustChangePassword,
    changeOwnPassword,
    displayName,
    theme,
    toggleTheme,
    toast: {
      msg: toastData.msg,
      color: toastData.color,
      visible: toastVisible,
    },
    showToast,
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    searchQuery,
    setSearchQuery,
    currentCat,
    setCurrentCat,
    currentSort,
    setCurrentSort,
    hiddenCats,
    deleteCategory,
    catColors,
    saveCategoryColor,
    authModal,
    setAuthModal,
    requireAuth,
    signIn,
    signOut,
    usersModal,
    setUsersModal,
    logsModal,
    setLogsModal,
    adminUsers,
    loadActivityLog,
    faqModal,
    setFaqModal,
    confirmModal,
    setConfirmModal,
    toggleStar,
    togglePin,
    incrementViews,
    saveFaq,
    deleteFaq,
    uploadFile,
    removeUploadedFile,
    exportJson,
    importJson,
    loadFaqs,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
