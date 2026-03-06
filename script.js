const WEBHOOK_URL =
  "https://webhook.chatdevendas.online/webhook/2439ac04-6865-4ad2-b2d9-ebdf710ff37f-AI";
const WHATSAPP_URL =
  "https://wa.me/557999343719?text=Ol%C3%A1!%20Quero%20saber%20se%20tenho%20direito%20ao%20cr%C3%A9dito%20consignado%20INSS.&type=phone_number&app_absent=0";

const form = document.getElementById("lead-form");
const steps = Array.from(document.querySelectorAll(".step"));
const resultQualified = document.getElementById("result-qualified");
const resultUnqualified = document.getElementById("result-unqualified");
const cpfInput = document.getElementById("cpf");
const phoneInput = document.getElementById("whatsapp");

let activeStep = 0;
let phoneInstance = null;

if (window.intlTelInput) {
  phoneInstance = window.intlTelInput(phoneInput, {
    initialCountry: "br",
    preferredCountries: ["br", "us", "pt"],
    separateDialCode: true,
    nationalMode: false,
    strictMode: true,
    autoPlaceholder: "aggressive",
    utilsScript:
      "https://cdn.jsdelivr.net/npm/intl-tel-input@24.6.0/build/js/utils.js"
  });
}

function showStep(stepNumber) {
  steps.forEach((step, index) => {
    step.classList.toggle("active", index === stepNumber);
  });
  activeStep = stepNumber;
}

function setError(stepElement, message) {
  const errorBox = stepElement.querySelector(".error");
  if (errorBox) {
    errorBox.textContent = message || "";
  }
}

function maskCPF(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function isValidCPF(value) {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (base, factor) => {
    let total = 0;
    for (let i = 0; i < base.length; i += 1) {
      total += Number(base[i]) * (factor - i);
    }
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const digit1 = calcDigit(cpf.slice(0, 9), 10);
  const digit2 = calcDigit(cpf.slice(0, 10), 11);

  return digit1 === Number(cpf[9]) && digit2 === Number(cpf[10]);
}

function getFormData() {
  const formData = new FormData(form);
  const payload = {};
  formData.forEach((value, key) => {
    payload[key] = String(value).trim();
  });

  const phone = phoneInstance ? phoneInstance.getNumber() : phoneInput.value;
  payload.whatsapp = phone.trim();
  return payload;
}

function validateStep(stepNumber) {
  const stepElement = steps[stepNumber];
  if (!stepElement) return true;

  setError(stepElement, "");

  if (stepNumber === 0) return true;

  if (stepNumber === 1) {
    const nome = form.nome.value.trim();
    if (nome.length < 3) {
      setError(stepElement, "Informe seu nome completo.");
      return false;
    }
  }

  if (stepNumber === 2) {
    const email = form.email.value.trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!validEmail) {
      setError(stepElement, "Digite um e-mail válido.");
      return false;
    }
  }

  if (stepNumber === 3) {
    const rawPhone = phoneInput.value.trim();
    const validByPlugin =
      phoneInstance && typeof phoneInstance.isValidNumber === "function"
        ? phoneInstance.isValidNumber()
        : false;
    const fallbackValid = rawPhone.replace(/\D/g, "").length >= 10;

    if (!validByPlugin && !fallbackValid) {
      setError(stepElement, "Digite um WhatsApp válido com DDD.");
      return false;
    }
  }

  if (stepNumber >= 4 && stepNumber <= 8) {
    const radio = stepElement.querySelector('input[type="radio"]:checked');
    if (!radio) {
      setError(stepElement, "Selecione uma opção para continuar.");
      return false;
    }
  }

  if (stepNumber === 9) {
    const cpf = form.cpf.value.trim();
    if (!isValidCPF(cpf)) {
      setError(stepElement, "Informe um CPF válido.");
      return false;
    }
  }

  return true;
}

function isLeadQualified(answers) {
  const qualifiedBeneficios = [
    "Aposentado INSS",
    "Pensionista INSS",
    "Aposentado por Invalidez (Espécie 32)",
    "Aposentado por Invalidez (Menos de 55 anos)"
  ];

  const qualifiedIdades = ["Até 60 anos", "De 61 a 65 anos", "De 66 a 70 anos"];
  const qualifiedAumento = [
    "Não, ainda não peguei o aumento deste ano.",
    "Não tenho certeza, gostaria de consultar."
  ];
  const qualifiedUltimoEmprestimo = [
    "Entre 6 e 11 meses.",
    "Há mais de 1 ano (Já paguei mais de 12 parcelas)."
  ];

  return (
    qualifiedBeneficios.includes(answers.beneficio) &&
    qualifiedIdades.includes(answers.idade) &&
    qualifiedAumento.includes(answers.aumento_salario) &&
    qualifiedUltimoEmprestimo.includes(answers.ultimo_emprestimo)
  );
}

async function sendWebhook(payload) {
  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function showFinalScreen(qualified) {
  form.classList.add("hidden");
  if (qualified) {
    resultQualified.classList.remove("hidden");
    window.setTimeout(() => {
      window.location.href = WHATSAPP_URL;
    }, 5000);
  } else {
    resultUnqualified.classList.remove("hidden");
  }
}

function nextStep() {
  if (!validateStep(activeStep)) return;
  const next = Math.min(activeStep + 1, steps.length - 1);
  showStep(next);
}

function prevStep() {
  const prev = Math.max(activeStep - 1, 0);
  showStep(prev);
}

form.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.classList.contains("btn-next")) {
    event.preventDefault();
    nextStep();
  }

  if (target.classList.contains("btn-back")) {
    event.preventDefault();
    prevStep();
  }
});

form.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.type !== "radio") return;

  const stepElement = target.closest(".step");
  if (!stepElement || !stepElement.classList.contains("active")) return;

  // Radios vivem nas etapas 4 a 8, avançando automaticamente ao selecionar.
  if (activeStep >= 4 && activeStep <= 8) {
    window.setTimeout(() => {
      nextStep();
    }, 120);
  }
});

cpfInput.addEventListener("input", () => {
  cpfInput.value = maskCPF(cpfInput.value);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateStep(activeStep)) return;

  const data = getFormData();
  const qualified = isLeadQualified(data);
  const payload = {
    ...data,
    qualified,
    createdAt: new Date().toISOString(),
    source: "form-filtro-vn-promotora"
  };

  try {
    await sendWebhook(payload);
  } catch (error) {
    console.error("Erro ao enviar webhook:", error);
  }

  showFinalScreen(qualified);
});
