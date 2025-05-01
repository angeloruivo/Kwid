document.addEventListener("DOMContentLoaded", function () {
  // Estado da aplicação
  let transactions =
    JSON.parse(localStorage.getItem("kwidPlus_transactions")) || [];
  let currentFilter = "all";
  let selectedMonth = null; // Armazena o mês selecionado (1 a 12 ou null)
  let tipoCombustivel = ""; // Variável para armazenar o tipo de combustível
  let plataformaSelecionada = "Nenhuma"; // Variável para armazenar a plataforma selecionada

  // Elementos DOM
  const formGanho = document.getElementById("form-ganho");
  const formAbastecimento = document.getElementById("form-abastecimento");
  const formManutencao = document.getElementById("form-manutencao");
  const advancedSection = document.getElementById("advanced-section");
  const relatorioDetalhado = document.getElementById("relatorio-detalhado");
  const monthFilter = document.getElementById("month-filter");
  const saldoAtualElement = document.getElementById("saldo-atual"); // Elemento para o lucro líquido do mês atual
  const exportExcelButton = document.getElementById("btn-export-excel"); // Novo botão de exportar para Excel

  // Erros
  const ganhoError = document.getElementById("ganho-error");
  const abastecimentoError = document.getElementById("abastecimento-error");
  const manutencaoError = document.getElementById("manutencao-error");
  const backupError = document.getElementById("backup-error");

  // Controle de abas
  document
    .getElementById("btn-ganho")
    .addEventListener("click", () => showTab("form-ganho"));
  document
    .getElementById("btn-abastecimento")
    .addEventListener("click", () => showTab("form-abastecimento"));
  document
    .getElementById("btn-manutencao")
    .addEventListener("click", () => showTab("form-manutencao"));

  // Botão avançado
  document
    .getElementById("btn-avancado")
    .addEventListener("click", toggleAdvancedSection);

  // Botões de filtro
  document.querySelectorAll(".filter-btn").forEach((button) => {
    if (button.tagName === "BUTTON") {
      button.addEventListener("click", function () {
        const filter = this.getAttribute("data-filter");
        setFilter(filter);
      });
    }
  });

  // Filtro de mês
  monthFilter.addEventListener("change", function () {
    const month = this.value;
    setFilter(
      month === "all" ? "all" : "month",
      month === "all" ? null : parseInt(month)
    );
  });

  // Ver relatório detalhado
  document
    .getElementById("btn-ver-relatorio")
    .addEventListener("click", toggleRelatorioDetalhado);

  // Backup e exportação
  document.getElementById("btn-backup").addEventListener("click", exportBackup);
  document
    .getElementById("import-backup")
    .addEventListener("change", importBackup);
  document
    .getElementById("btn-limpar")
    .addEventListener("click", confirmClearData);
  exportExcelButton.addEventListener("click", exportToExcel); // Listener para o novo botão

  // Formulários
  document.getElementById("ganho-form").addEventListener("submit", addGanho);
  document
    .getElementById("abastecimento-form")
    .addEventListener("submit", addAbastecimento);
  document
    .getElementById("manutencao-form")
    .addEventListener("submit", addManutencao);

  // Inicializar data atual nos formulários
  const today = new Date();
  const formattedToday = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  document.getElementById("ganho-data").value = formattedToday;
  document.getElementById("abastecimento-data").value = formattedToday;
  document.getElementById("manutencao-data").value = formattedToday;

  // Funções de seleção de plataforma
  window.selectPlatform = function (platform) {
    plataformaSelecionada = platform;
    document.getElementById("platform-name").textContent =
      plataformaSelecionada;

    // Remover a classe 'selected' de todos os botões
    document.querySelectorAll("#form-ganho button").forEach((btn) => {
      btn.classList.remove("selected");
    });

    // Adicionar a classe 'selected' ao botão clicado
    document
      .getElementById(`btn-ganho-${platform.toLowerCase()}`)
      .classList.add("selected");
  };

  // Funções de seleção de combustível
  window.selectFuel = function (fuel) {
    tipoCombustivel = fuel;
    document.getElementById("fuel-name").textContent = tipoCombustivel;

    // Remover a classe 'selected' de todos os botões
    document.querySelectorAll("#form-abastecimento button").forEach((btn) => {
      btn.classList.remove("selected");
    });

    // Adicionar a classe 'selected' ao botão clicado
    document
      .getElementById(`btn-${fuel.toLowerCase()}`)
      .classList.add("selected");
  };

  // Carregar dados iniciais
  renderTransactions();
  updateSummary(); // Call updateSummary initially

  // Funções
  function showTab(tabId) {
    document.querySelectorAll(".tab-content").forEach((tab) => {
      tab.classList.remove("active");
    });
    document.getElementById(tabId).classList.add("active");
  }

  function toggleAdvancedSection() {
    advancedSection.classList.toggle("show");
  }

  function toggleRelatorioDetalhado() {
    relatorioDetalhado.classList.toggle("hidden");
    const btnText = relatorioDetalhado.classList.contains("hidden")
      ? '<i class="fas fa-chart-bar mr-2"></i>Ver Relatório Detalhado'
      : '<i class="fas fa-times mr-2"></i>Fechar Relatório';
    document.getElementById("btn-ver-relatorio").innerHTML = btnText;
  }

  function setFilter(filter, month = null) {
    currentFilter = filter;
    selectedMonth = month;

    // Atualizar classe ativa dos botões e dropdown
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

    // Atualizar classe ativa do dropdown
    if (filter === "month" && selectedMonth !== null) {
      monthFilter.classList.add("active");
    } else {
      monthFilter.classList.remove("active");
    }
    if (filter !== "month") {
      // Remove active class from month dropdown if another filter is selected
      monthFilter.classList.remove("active");
    }

    // Atualizar os dados com base no filtro
    renderTransactions();
    updateSummary();
  }

  function addGanho(e) {
    e.preventDefault();

    const data = document.getElementById("ganho-data").value;
    const valor = parseFloat(document.getElementById("ganho-valor").value);

    if (
      !data ||
      plataformaSelecionada === "Nenhuma" ||
      isNaN(valor) ||
      valor <= 0
    ) {
      ganhoError.classList.remove("hidden");
      return;
    }

    ganhoError.classList.add("hidden");

    const transaction = {
      id: Date.now(),
      date: data,
      type: "ganho",
      platform: plataformaSelecionada,
      details: `Ganho (${plataformaSelecionada})`,
      amount: valor,
    };

    transactions.push(transaction);
    saveTransactions();
    renderTransactions();
    updateSummary();

    document.getElementById("ganho-valor").value = "";
    plataformaSelecionada = "Nenhuma"; // Resetar a plataforma após o envio
    document.getElementById("platform-name").textContent =
      plataformaSelecionada;
  }

  function addAbastecimento(e) {
    e.preventDefault();

    const data = document.getElementById("abastecimento-data").value;
    const valor = parseFloat(
      document.getElementById("abastecimento-valor").value
    );

    if (!data || !tipoCombustivel || isNaN(valor) || valor <= 0) {
      abastecimentoError.classList.remove("hidden");
      return;
    }

    abastecimentoError.classList.add("hidden");

    const transaction = {
      id: Date.now(),
      date: data,
      type: "abastecimento",
      fuelType: tipoCombustivel,
      details: `Abastecimento (${tipoCombustivel})`,
      amount: -valor,
    };

    transactions.push(transaction);
    saveTransactions();
    renderTransactions();
    updateSummary();

    document.getElementById("abastecimento-valor").value = "";
    tipoCombustivel = ""; // Resetar o tipo de combustível após o envio
    document.getElementById("fuel-name").textContent = "Nenhum";
  }

  function addManutencao(e) {
    e.preventDefault();

    const data = document.getElementById("manutencao-data").value;
    const tipo = document.getElementById("manutencao-tipo").value;
    const valor = parseFloat(document.getElementById("manutencao-valor").value);

    if (!data || !tipo || isNaN(valor) || valor <= 0) {
      manutencaoError.classList.remove("hidden");
      return;
    }

    manutencaoError.classList.add("hidden");

    const transaction = {
      id: Date.now(),
      date: data,
      type: "manutencao",
      maintenanceType: tipo,
      details: `Manutenção: ${tipo}`,
      amount: -valor,
    };

    transactions.push(transaction);
    saveTransactions();
    renderTransactions();
    updateSummary();

    document.getElementById("manutencao-tipo").value = "";
    document.getElementById("manutencao-valor").value = "";
  }

  function renderTransactions() {
    const filteredTransactions = filterTransactions();
    const tbody = document.getElementById("transaction-history");
    const noTransactions = document.getElementById("no-transactions");

    tbody.innerHTML = "";

    if (filteredTransactions.length === 0) {
      noTransactions.style.display = "block";
      return;
    }

    noTransactions.style.display = "none";

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
                            <td class="${
                              isExpense ? "text-red-600" : "text-green-600"
                            }">${isExpense ? "-" : ""}${formattedAmount}</td>
                            <td>
                                <button class="delete-btn p-1 text-red-600 hover:text-red-800" data-id="${
                                  transaction.id
                                }">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        `;

        tbody.appendChild(tr);
      });

    // Adicionar listeners aos botões de exclusão
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const id = parseInt(this.getAttribute("data-id"));
        deleteTransaction(id);
      });
    });
  }

  function filterTransactions(filter = currentFilter, month = selectedMonth) {
    let transactionsToFilter = [...transactions];

    if (filter === "day") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      transactionsToFilter = transactionsToFilter.filter((transaction) => {
        if (!transaction.date || !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date))
          return false;
        const [year, month, day] = transaction.date.split("-").map(Number);
        const transactionDate = new Date(year, month - 1, day);
        return transactionDate.getTime() === today.getTime();
      });
    } else if (filter === "week") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const firstDayOfWeek = new Date(today);
      const day = today.getDay() || 7;
      firstDayOfWeek.setDate(today.getDate() - day + 1);
      firstDayOfWeek.setHours(0, 0, 0, 0);

      transactionsToFilter = transactionsToFilter.filter((transaction) => {
        if (!transaction.date || !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date))
          return false;
        const [year, month, day] = transaction.date.split("-").map(Number);
        const transactionDate = new Date(year, month - 1, day);
        return transactionDate >= firstDayOfWeek && transactionDate <= today;
      });
    } else if (filter === "month" && month !== null) {
      const filterYear = new Date().getFullYear(); // Assume current year for month filter
      transactionsToFilter = transactionsToFilter.filter((transaction) => {
        if (
          !transaction.date ||
          !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)
        ) {
          return false;
        }
        const [year, transactionMonth, day] = transaction.date
          .split("-")
          .map(Number);
        return transactionMonth === month && year === filterYear;
      });
    } else if (filter === "all") {
      transactionsToFilter = [...transactions];
    }

    return transactionsToFilter;
  }

  function updateSummary() {
    // Calculate net profit for the current month for the dashboard display
    const currentMonth = new Date().getMonth() + 1;
    const currentMonthTransactions = filterTransactions("month", currentMonth);
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
    saldoAtualElement.textContent = formatCurrency(lucroLiquidoMonth);
    if (lucroLiquidoMonth > 0) {
      saldoAtualElement.classList.add("text-green-600");
      saldoAtualElement.classList.remove("text-red-600", "text-gray-800");
    } else if (lucroLiquidoMonth < 0) {
      saldoAtualElement.classList.add("text-red-600");
      saldoAtualElement.classList.remove("text-green-600", "text-gray-800");
    } else {
      saldoAtualElement.classList.add("text-gray-800");
      saldoAtualElement.classList.remove("text-green-600", "text-red-600");
    }

    // Calculate summary based on the currently active filter for the main summary section
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

        if (transaction.type === "manutencao") {
          custoManutencaoFiltered += Math.abs(transaction.amount);
        } else if (transaction.type === "abastecimento") {
          custoCombustivelFiltered += Math.abs(transaction.amount);
        }
      }
    });

    const lucroLiquidoFiltered = totalGanhosFiltered - totalCustosFiltered;

    // Update the main summary section
    document.getElementById("total-ganhos").textContent =
      formatCurrency(totalGanhosFiltered);
    document.getElementById("total-custos").textContent =
      formatCurrency(totalCustosFiltered);
    document.getElementById("lucro-liquido").textContent =
      formatCurrency(lucroLiquidoFiltered);

    // Update the detailed report
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

    // Definir cores do lucro líquido no resumo principal
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

    // Definir cores do lucro líquido no relatório detalhado
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
      renderTransactions();
      updateSummary();
    }
  }

  function saveTransactions() {
    localStorage.setItem("kwidPlus_transactions", JSON.stringify(transactions));
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
          // Validar formato das transações
          const validTransactions = data.filter(
            (t) =>
              t.id &&
              t.date &&
              /^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
              t.type &&
              t.amount
          );
          transactions = validTransactions;
          saveTransactions();
          renderTransactions();
          updateSummary();
          backupError.classList.add("hidden");
          alert("Backup importado com sucesso!");
        } else {
          throw new Error("Formato inválido");
        }
      } catch (error) {
        backupError.classList.remove("hidden");
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
      renderTransactions();
      updateSummary();
      alert("Todos os dados foram excluídos com sucesso!");
    }
  }

  function formatDate(dateString, forFilename = false) {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
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
    return `R$ ${value.toFixed(2)}`;
  }

  function escapeCsv(value) {
    if (value === null || value === undefined) {
      return "";
    }
    // Convert to string and escape double quotes
    const stringValue = String(value).replace(/"/g, '""');
    // Enclose in double quotes if it contains comma, double quote, or newline
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue}"`;
    }
    return stringValue;
  }

  function exportToExcel() {
    const allTransactions = [...transactions]; // Get all transactions

    if (allTransactions.length === 0) {
      alert("Nenhuma transação para exportar.");
      return;
    }

    // Define CSV headers
    const headers = [
      "Data",
      "Tipo",
      "Detalhe",
      "Plataforma/Combustível/Manutenção Tipo",
      "Valor",
    ];
    let csvContent = headers.map(escapeCsv).join(";") + "\n"; // Use semicolon as separator

    // Add transaction data
    allTransactions.forEach((transaction) => {
      const date = formatDate(transaction.date);
      const type = transaction.type;
      const details = transaction.details;
      let specificDetail = "";

      if (transaction.type === "ganho") {
        specificDetail = transaction.platform || "";
      } else if (transaction.type === "abastecimento") {
        specificDetail = transaction.fuelType || "";
      } else if (transaction.type === "manutencao") {
        specificDetail = transaction.maintenanceType || "";
      }

      // Format the amount with comma as decimal separator and ensure it's a string
      const amount = transaction.amount.toFixed(2).replace(".", ",");

      csvContent +=
        [
          escapeCsv(date),
          escapeCsv(type),
          escapeCsv(details),
          escapeCsv(specificDetail),
          escapeCsv(amount), // Escape the formatted amount string
        ].join(";") + "\n"; // Use semicolon as separator
    });

    // Create Blob and download link
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
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

  // Set the initial filter to the current month and update the summary
  const currentMonth = new Date().getMonth() + 1;
  setFilter("month", currentMonth);
  monthFilter.value = currentMonth.toString(); // Select the current month in the dropdown
  monthFilter.classList.add("active"); // Add active class to the month filter

  // Ensure "Todos" button is not active initially
  document
    .querySelector('.filter-btn[data-filter="all"]')
    .classList.remove("active");
});
