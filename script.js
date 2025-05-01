document.addEventListener("DOMContentLoaded", function () {
  const TRANSACTION_TYPES = {
    GANHO: "ganho",
    ABASTECIMENTO: "abastecimento",
    MANUTENCAO: "manutencao",
  };
  const FILTER_TYPES = {
    ALL: "all",
    DAY: "day",
    WEEK: "week",
    MONTH: "month",
  };

  let transactions = [];
  try {
    const stored = localStorage.getItem("kwidPlus_transactions");
    if (stored) {
      transactions = JSON.parse(stored);
      if (!Array.isArray(transactions)) transactions = [];
    }
  } catch (e) {
    console.error("Erro ao carregar transações:", e);
    transactions = [];
  }
  let currentFilter = FILTER_TYPES.ALL;
  let selectedMonth = null;
  let tipoCombustivel = "";
  let plataformaSelecionada = "Nenhuma";

  const elements = {
    formGanho: document.getElementById("form-ganho"),
    formAbastecimento: document.getElementById("form-abastecimento"),
    formManutencao: document.getElementById("form-manutencao"),
    advancedSection: document.getElementById("advanced-section"),
    relatorioDetalhado: document.getElementById("relatorio-detalhado"),
    monthFilter: document.getElementById("month-filter"),
    saldoAtualElement: document.getElementById("saldo-atual"),
    exportExcelButton: document.getElementById("btn-export-excel"),
    toggleDarkModeBtn: document.getElementById("toggle-dark-mode"),
    ganhoError: document.getElementById("ganho-error"),
    abastecimentoError: document.getElementById("abastecimento-error"),
    manutencaoError: document.getElementById("manutencao-error"),
    backupError: document.getElementById("backup-error"),
    ganhoForm: document.getElementById("ganho-form"),
    abastecimentoForm: document.getElementById("abastecimento-form"),
    manutencaoForm: document.getElementById("manutencao-form"),
    ganhoData: document.getElementById("ganho-data"),
    abastecimentoData: document.getElementById("abastecimento-data"),
    manutencaoData: document.getElementById("manutencao-data"),
    transactionHistory: document.getElementById("transaction-history"),
    noTransactions: document.getElementById("no-transactions"),
  };

  for (const [key, value] of Object.entries(elements)) {
    if (!value) {
      console.error(`Elemento '${key}' não encontrado`);
      return;
    }
  }

  function debounce(fn, ms) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function isValidDate(dateString) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  function isValidAmount(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0 && /^\d*\.?\d{0,2}$/.test(value);
  }

  function showError(element, message) {
    element.textContent = message;
    element.classList.remove("hidden");
  }

  document
    .getElementById("btn-ganho")
    .addEventListener("click", () => showTab("form-ganho"));
  document
    .getElementById("btn-abastecimento")
    .addEventListener("click", () => showTab("form-abastecimento"));
  document
    .getElementById("btn-manutencao")
    .addEventListener("click", () => showTab("form-manutencao"));
  document
    .getElementById("btn-avancado")
    .addEventListener("click", toggleAdvancedSection);
  document
    .getElementById("btn-ver-relatorio")
    .addEventListener("click", toggleRelatorioDetalhado);

  document.querySelectorAll(".filter-btn").forEach((button) => {
    if (button.tagName === "BUTTON") {
      button.addEventListener("click", function () {
        const filter = this.getAttribute("data-filter");
        setFilter(filter);
      });
    }
  });

  elements.monthFilter.addEventListener("change", function () {
    const month = this.value;
    setFilter(
      month === "all" ? FILTER_TYPES.ALL : FILTER_TYPES.MONTH,
      month === "all" ? null : parseInt(month)
    );
  });

  document.getElementById("btn-backup").addEventListener("click", exportBackup);
  document
    .getElementById("import-backup")
    .addEventListener("change", importBackup);
  document
    .getElementById("btn-limpar")
    .addEventListener("click", confirmClearData);
  elements.exportExcelButton.addEventListener("click", exportToExcel);

  if (localStorage.getItem("theme") === "dark") {
    document.body.setAttribute("data-theme", "dark");
    elements.toggleDarkModeBtn.innerHTML =
      '<i class="fas fa-sun"></i> Modo Claro';
  }

  elements.toggleDarkModeBtn.addEventListener("click", () => {
    if (document.body.getAttribute("data-theme") === "dark") {
      document.body.removeAttribute("data-theme");
      elements.toggleDarkModeBtn.innerHTML =
        '<i class="fas fa-moon"></i> Modo Escuro';
      localStorage.setItem("theme", "light");
    } else {
      document.body.setAttribute("data-theme", "dark");
      elements.toggleDarkModeBtn.innerHTML =
        '<i class="fas fa-sun"></i> Modo Claro';
      localStorage.setItem("theme", "dark");
    }
  });

  elements.ganhoForm.addEventListener("submit", addGanho);
  elements.abastecimentoForm.addEventListener("submit", addAbastecimento);
  elements.manutencaoForm.addEventListener("submit", addManutencao);

  const today = new Date();
  const formattedToday = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  elements.ganhoData.value = formattedToday;
  elements.abastecimentoData.value = formattedToday;
  elements.manutencaoData.value = formattedToday;

  window.selectPlatform = function (platform) {
    plataformaSelecionada = platform;
    document.getElementById("platform-name").textContent =
      plataformaSelecionada;

    document.querySelectorAll("#form-ganho button").forEach((btn) => {
      btn.classList.remove("selected");
    });

    document
      .getElementById(`btn-ganho-${platform.toLowerCase()}`)
      .classList.add("selected");
  };

  window.selectFuel = function (fuel) {
    tipoCombustivel = fuel;
    document.getElementById("fuel-name").textContent = tipoCombustivel;

    document.querySelectorAll("#form-abastecimento button").forEach((btn) => {
      btn.classList.remove("selected");
    });

    document
      .getElementById(`btn-${fuel.toLowerCase()}`)
      .classList.add("selected");
  };

  const debouncedRender = debounce(renderTransactions, 100);
  const debouncedUpdate = debounce(updateSummary, 100);

  debouncedRender();
  debouncedUpdate();

  function showTab(tabId) {
    document.querySelectorAll(".tab-content").forEach((tab) => {
      tab.classList.remove("active");
    });
    document.getElementById(tabId).classList.add("active");
  }

  function toggleAdvancedSection() {
    elements.advancedSection.classList.toggle("show");
  }

  function toggleRelatorioDetalhado() {
    elements.relatorioDetalhado.classList.toggle("hidden");
    const btnText = elements.relatorioDetalhado.classList.contains("hidden")
      ? '<i class="fas fa-chart-bar mr-1"></i>Ver Relatório Detalhado'
      : '<i class="fas fa-times mr-1"></i>Fechar Relatório';
    document.getElementById("btn-ver-relatorio").innerHTML = btnText;
  }

  function setFilter(filter, month = null) {
    currentFilter = filter;
    selectedMonth = month;

    document.querySelectorAll(".filter-btn").forEach((btn) => {
      if (
        btn.tagName === "BUTTON" &&
        btn.getAttribute("data-filter") === filter
      ) {
        btn.classList.add("active");
      } else if (btn.tagName === "BUTTON") {
        btn.classList.remove("active");
      }
    });

    if (filter === FILTER_TYPES.MONTH && selectedMonth !== null) {
      elements.monthFilter.classList.add("active");
    } else {
      elements.monthFilter.classList.remove("active");
    }

    debouncedRender();
    debouncedUpdate();
  }

  function addGanho(e) {
    e.preventDefault();

    const data = elements.ganhoData.value;
    const valor = elements.ganhoForm.querySelector("#ganho-valor").value;

    if (!isValidDate(data)) {
      showError(elements.ganhoError, "Por favor, informe uma data válida.");
      return;
    }
    if (plataformaSelecionada === "Nenhuma") {
      showError(elements.ganhoError, "Por favor, selecione uma plataforma.");
      return;
    }
    if (!isValidAmount(valor)) {
      showError(
        elements.ganhoError,
        "Por favor, informe um valor numérico válido maior que zero."
      );
      return;
    }

    elements.ganhoError.classList.add("hidden");

    const transaction = {
      id: Date.now(),
      date: data,
      type: TRANSACTION_TYPES.GANHO,
      platform: plataformaSelecionada,
      details: `Ganho (${plataformaSelecionada})`,
      amount: parseFloat(valor),
    };

    transactions.push(transaction);
    saveTransactions();
    debouncedRender();
    debouncedUpdate();

    elements.ganhoForm.querySelector("#ganho-valor").value = "";
    plataformaSelecionada = "Nenhuma";
    document.getElementById("platform-name").textContent =
      plataformaSelecionada;
  }

  function addAbastecimento(e) {
    e.preventDefault();

    const data = elements.abastecimentoData.value;
    const valor = elements.abastecimentoForm.querySelector(
      "#abastecimento-valor"
    ).value;

    if (!isValidDate(data)) {
      showError(
        elements.abastecimentoError,
        "Por favor, informe uma data válida."
      );
      return;
    }
    if (!tipoCombustivel) {
      showError(
        elements.abastecimentoError,
        "Por favor, selecione um tipo de combustível."
      );
      return;
    }
    if (!isValidAmount(valor)) {
      showError(
        elements.abastecimentoError,
        "Por favor, informe um valor numérico válido maior que zero."
      );
      return;
    }

    elements.abastecimentoError.classList.add("hidden");

    const transaction = {
      id: Date.now(),
      date: data,
      type: TRANSACTION_TYPES.ABASTECIMENTO,
      fuelType: tipoCombustivel,
      details: `Abastecimento (${tipoCombustivel})`,
      amount: -parseFloat(valor),
    };

    transactions.push(transaction);
    saveTransactions();
    debouncedRender();
    debouncedUpdate();

    elements.abastecimentoForm.querySelector("#abastecimento-valor").value = "";
    tipoCombustivel = "";
    document.getElementById("fuel-name").textContent = "Nenhum";
  }

  function addManutencao(e) {
    e.preventDefault();

    const data = elements.manutencaoData.value;
    const tipo =
      elements.manutencaoForm.querySelector("#manutencao-tipo").value;
    const valor =
      elements.manutencaoForm.querySelector("#manutencao-valor").value;

    if (!isValidDate(data)) {
      showError(
        elements.manutencaoError,
        "Por favor, informe uma data válida."
      );
      return;
    }
    if (!tipo) {
      showError(
        elements.manutencaoError,
        "Por favor, informe o tipo de manutenção."
      );
      return;
    }
    if (!isValidAmount(valor)) {
      showError(
        elements.manutencaoError,
        "Por favor, informe um valor numérico válido maior que zero."
      );
      return;
    }

    elements.manutencaoError.classList.add("hidden");

    const transaction = {
      id: Date.now(),
      date: data,
      type: TRANSACTION_TYPES.MANUTENCAO,
      maintenanceType: tipo,
      details: `Manutenção: ${tipo}`,
      amount: -parseFloat(valor),
    };

    transactions.push(transaction);
    saveTransactions();
    debouncedRender();
    debouncedUpdate();

    elements.manutencaoForm.querySelector("#manutencao-tipo").value = "";
    elements.manutencaoForm.querySelector("#manutencao-valor").value = "";
  }

  function renderTransactions() {
    const filteredTransactions = filterTransactions();
    elements.transactionHistory.innerHTML = "";

    if (filteredTransactions.length === 0) {
      elements.noTransactions.style.display = "block";
      return;
    }

    elements.noTransactions.style.display = "none";

    filteredTransactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((transaction) => {
        const tr = document.createElement("tr");

        const formattedDate = formatDate(transaction.date);
        const formattedAmount = formatCurrency(Math.abs(transaction.amount));
        const isExpense = transaction.amount < 0;

        tr.innerHTML = `
          <td>${formattedDate}</td>
          <td>${transaction.details}</td>
          <td class="${isExpense ? "text-red-600" : "text-green-600"}">${
          isExpense ? "-" : ""
        }${formattedAmount}</td>
          <td>
            <button class="delete-btn p-1 text-red-600 hover:text-red-800" data-id="${
              transaction.id
            }" aria-label="Excluir transação">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        `;

        elements.transactionHistory.appendChild(tr);
      });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const id = parseInt(this.getAttribute("data-id"));
        deleteTransaction(id);
      });
    });
  }

  function filterTransactions(filter = currentFilter, month = selectedMonth) {
    let transactionsToFilter = [...transactions];

    if (filter === FILTER_TYPES.DAY) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      transactionsToFilter = transactionsToFilter.filter((transaction) => {
        if (!transaction.date || !isValidDate(transaction.date)) return false;
        const [year, month, day] = transaction.date.split("-").map(Number);
        const transactionDate = new Date(year, month - 1, day);
        return (
          transactionDate.getFullYear() === today.getFullYear() &&
          transactionDate.getMonth() === today.getMonth() &&
          transactionDate.getDate() === today.getDate()
        );
      });
    } else if (filter === FILTER_TYPES.WEEK) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const firstDayOfWeek = new Date(today);
      const day = today.getDay() || 7;
      firstDayOfWeek.setDate(today.getDate() - day + 1);
      firstDayOfWeek.setHours(0, 0, 0, 0);

      transactionsToFilter = transactionsToFilter.filter((transaction) => {
        if (!transaction.date || !isValidDate(transaction.date)) return false;
        const [year, month, day] = transaction.date.split("-").map(Number);
        const transactionDate = new Date(year, month - 1, day);
        return transactionDate >= firstDayOfWeek && transactionDate <= today;
      });
    } else if (filter === FILTER_TYPES.MONTH && month !== null) {
      const filterYear = new Date().getFullYear();
      transactionsToFilter = transactionsToFilter.filter((transaction) => {
        if (!transaction.date || !isValidDate(transaction.date)) return false;
        const [year, transactionMonth] = transaction.date
          .split("-")
          .map(Number);
        return transactionMonth === month && year === filterYear;
      });
    } else if (filter === FILTER_TYPES.ALL) {
      transactionsToFilter = [...transactions];
    }

    return transactionsToFilter;
  }

  function updateSummary() {
    const currentMonth = new Date().getMonth() + 1;
    const currentMonthTransactions = filterTransactions(
      FILTER_TYPES.MONTH,
      currentMonth
    );
    let totalGanhosMonth = 0;
    let totalCustosMonth = 0;

    currentMonthTransactions.forEach((transaction) => {
      if (transaction.amount > 0) {
        totalGanhosMonth += transaction.amount;
      } else {
        totalCustosMonth += Math.abs(transaction.amount);
      }
    });
    const lucroLiquidoMonth = totalGanhosMonth - totalCustosMonth;
    elements.saldoAtualElement.textContent = formatCurrency(lucroLiquidoMonth);
    if (lucroLiquidoMonth > 0) {
      elements.saldoAtualElement.classList.add("text-green-600");
      elements.saldoAtualElement.classList.remove(
        "text-red-600",
        "text-gray-800"
      );
    } else if (lucroLiquidoMonth < 0) {
      elements.saldoAtualElement.classList.add("text-red-600");
      elements.saldoAtualElement.classList.remove(
        "text-green-600",
        "text-gray-800"
      );
    } else {
      elements.saldoAtualElement.classList.add("text-gray-800");
      elements.saldoAtualElement.classList.remove(
        "text-green-600",
        "text-red-600"
      );
    }

    const filteredTransactions = filterTransactions();
    let totalGanhosFiltered = 0;
    let totalCustosFiltered = 0;
    let ganho99Filtered = 0;
    let ganhoUberFiltered = 0;
    let custoManutencaoFiltered = 0;
    let custoCombustivelFiltered = 0;

    filteredTransactions.forEach((transaction) => {
      if (transaction.amount > 0) {
        totalGanhosFiltered += transaction.amount;
        if (transaction.platform === "99") {
          ganho99Filtered += transaction.amount;
        } else if (transaction.platform === "Uber") {
          ganhoUberFiltered += transaction.amount;
        }
      } else {
        totalCustosFiltered += Math.abs(transaction.amount);
        if (transaction.type === TRANSACTION_TYPES.MANUTENCAO) {
          custoManutencaoFiltered += Math.abs(transaction.amount);
        } else if (transaction.type === TRANSACTION_TYPES.ABASTECIMENTO) {
          custoCombustivelFiltered += Math.abs(transaction.amount);
        }
      }
    });

    const lucroLiquidoFiltered = totalGanhosFiltered - totalCustosFiltered;

    document.getElementById("total-ganhos").textContent =
      formatCurrency(totalGanhosFiltered);
    document.getElementById("total-custos").textContent =
      formatCurrency(totalCustosFiltered);
    document.getElementById("lucro-liquido").textContent =
      formatCurrency(lucroLiquidoFiltered);
    document.getElementById("custo-manutencao").textContent = formatCurrency(
      custoManutencaoFiltered
    );
    document.getElementById("custo-combustivel").textContent = formatCurrency(
      custoCombustivelFiltered
    );
    document.getElementById("relatorio-total-custos").textContent =
      formatCurrency(totalCustosFiltered);
    document.getElementById("ganho-99").textContent =
      formatCurrency(ganho99Filtered);
    document.getElementById("ganho-uber").textContent =
      formatCurrency(ganhoUberFiltered);
    document.getElementById("relatorio-total-ganhos").textContent =
      formatCurrency(totalGanhosFiltered);
    document.getElementById("relatorio-lucro-liquido").textContent =
      formatCurrency(lucroLiquidoFiltered);

    const lucroLiquidoElement = document.getElementById("lucro-liquido");
    if (lucroLiquidoFiltered > 0) {
      lucroLiquidoElement.classList.add("text-green-800");
      lucroLiquidoElement.classList.remove("text-red-800");
    } else if (lucroLiquidoFiltered < 0) {
      lucroLiquidoElement.classList.add("text-red-800");
      lucroLiquidoElement.classList.remove("text-green-800");
    } else {
      lucroLiquidoElement.classList.remove("text-green-800", "text-red-800");
    }

    const relatorioLucroLiquidoElement = document.getElementById(
      "relatorio-lucro-liquido"
    );
    if (lucroLiquidoFiltered > 0) {
      relatorioLucroLiquidoElement.classList.add("text-green-800");
      relatorioLucroLiquidoElement.classList.remove("text-red-800");
    } else if (lucroLiquidoFiltered < 0) {
      relatorioLucroLiquidoElement.classList.add("text-red-800");
      relatorioLucroLiquidoElement.classList.remove("text-green-800");
    } else {
      relatorioLucroLiquidoElement.classList.remove(
        "text-green-800",
        "text-red-800"
      );
    }
  }

  function deleteTransaction(id) {
    if (confirm("Tem certeza que deseja excluir esta transação?")) {
      transactions = transactions.filter((t) => t.id !== id);
      saveTransactions();
      debouncedRender();
      debouncedUpdate();
    }
  }

  function saveTransactions() {
    try {
      localStorage.setItem(
        "kwidPlus_transactions",
        JSON.stringify(transactions)
      );
    } catch (e) {
      console.error("Erro ao salvar transações:", e);
    }
  }

  function exportBackup() {
    const data = JSON.stringify(transactions);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `kwid_plus_backup_${formatDate(
      new Date().toISOString().split("T")[0],
      true
    )}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const data = JSON.parse(event.target.result);

        if (Array.isArray(data)) {
          const validTransactions = data.filter(
            (t) =>
              t.id &&
              t.date &&
              isValidDate(t.date) &&
              t.type &&
              typeof t.amount === "number"
          );
          transactions = validTransactions;
          saveTransactions();
          debouncedRender();
          debouncedUpdate();
          elements.backupError.classList.add("hidden");
          alert("Backup importado com sucesso!");
        } else {
          throw new Error("Formato inválido");
        }
      } catch (error) {
        showError(
          elements.backupError,
          "Erro ao importar backup: formato inválido."
        );
      }
    };
    reader.readAsText(file);
  }

  function confirmClearData() {
    if (
      confirm(
        "Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita."
      )
    ) {
      transactions = [];
      saveTransactions();
      debouncedRender();
      debouncedUpdate();
      alert("Todos os dados foram excluídos com sucesso!");
    }
  }

  function formatDate(dateString, forFilename = false) {
    if (!dateString || !isValidDate(dateString)) {
      return "Data inválida";
    }
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (forFilename) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")}`;
    }

    return `${String(date.getDate()).padStart(
      2,
      "0"
    )}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  function escapeCsv(value) {
    if (value === null || value === undefined) {
      return "";
    }
    const stringValue = String(value).replace(/"/g, '""');
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue}"`;
    }
    return stringValue;
  }

  function exportToExcel() {
    const allTransactions = [...transactions];

    if (allTransactions.length === 0) {
      alert("Nenhuma transação para exportar.");
      return;
    }

    const headers = [
      "Data",
      "Tipo",
      "Detalhe",
      "Plataforma/Combustível/Manutenção Tipo",
      "Valor",
    ];
    let csvContent = headers.map(escapeCsv).join(";") + "\n";

    allTransactions.forEach((transaction) => {
      const date = formatDate(transaction.date);
      const type = transaction.type;
      const details = transaction.details;
      let specificDetail = "";

      if (transaction.type === TRANSACTION_TYPES.GANHO) {
        specificDetail = transaction.platform || "";
      } else if (transaction.type === TRANSACTION_TYPES.ABASTECIMENTO) {
        specificDetail = transaction.fuelType || "";
      } else if (transaction.type === TRANSACTION_TYPES.MANUTENCAO) {
        specificDetail = transaction.maintenanceType || "";
      }

      const amount = transaction.amount.toFixed(2).replace(".", ",");

      csvContent +=
        [
          escapeCsv(date),
          escapeCsv(type),
          escapeCsv(details),
          escapeCsv(specificDetail),
          escapeCsv(amount),
        ].join(";") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `kwid_plus_transacoes_${formatDate(
      new Date().toISOString().split("T")[0],
      true
    )}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const currentMonth = new Date().getMonth() + 1;
  setFilter(FILTER_TYPES.MONTH, currentMonth);
  elements.monthFilter.value = currentMonth.toString();
  elements.monthFilter.classList.add("active");
});
