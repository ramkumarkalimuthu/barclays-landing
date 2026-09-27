(function () {
  "use strict";

  function initScrollAnimations() {
    if (!window.gsap || !window.ScrollTrigger || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    window.gsap.registerPlugin(window.ScrollTrigger);

    const pageRevealSelector = [
      ".hero-copy > *",
      ".hero-visual",
      ".services .section-head",
      ".service-card",
      ".why-copy > *",
      ".why-quote",
      ".enquiry .section-head",
      ".site-footer .wrap"
    ].join(", ");

    window.gsap.utils.toArray(pageRevealSelector).forEach(function (element, index) {
      window.gsap.fromTo(element, { autoAlpha: 0, y: 22 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.65,
        delay: element.closest(".hero") ? index * 0.08 : 0,
        ease: "power2.out",
        scrollTrigger: { trigger: element, start: "top 90%", once: true }
      });
    });

    window.gsap.utils.toArray('[data-gsap="reveal"]').forEach(function (element) {
      window.gsap.fromTo(element, { autoAlpha: 0, y: 24 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: element, start: "top 88%", once: true }
      });
    });

    window.gsap.utils.toArray("[data-gsap-stagger]").forEach(function (group) {
      window.gsap.fromTo(group.children, { autoAlpha: 0, y: 18 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.55,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: { trigger: group, start: "top 86%", once: true }
      });
    });
  }

  initScrollAnimations();

  const accordionItems = Array.from(document.querySelectorAll(".enquiry-accordion-item"));

  function openAccordionItem(itemId) {
    const targetItem = document.getElementById(itemId);
    if (!targetItem) return;

    accordionItems.forEach(function (item) {
      item.open = item === targetItem;
    });
    targetItem.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  accordionItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (!item.open) return;
      accordionItems.forEach(function (otherItem) {
        if (otherItem !== item) otherItem.open = false;
      });
    });
  });

  /* =========================================================
     Mobile nav toggle
     ========================================================= */
  const navToggle = document.getElementById("navToggle");
  const primaryNav = document.getElementById("primaryNav");

  if (navToggle && primaryNav) {
    navToggle.addEventListener("click", function () {
      const isOpen = primaryNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    primaryNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        primaryNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* =========================================================
     Conditional business-type fields
     ========================================================= */
  const businessType = document.getElementById("businessType");
  const soleTraderFields = document.getElementById("soleTraderFields");
  const limitedCompanyFields = document.getElementById("limitedCompanyFields");

  // Fields that only become required when their group is visible
  const soleTraderInputs = soleTraderFields ? soleTraderFields.querySelectorAll("input") : [];
  const limitedCompanyInputs = limitedCompanyFields ? limitedCompanyFields.querySelectorAll("input") : [];

  function updateBusinessTypeFields() {
    const value = businessType.value;

    const showSole = value === "sole-trader";
    const showLimited = value === "limited-company";

    soleTraderFields.hidden = !showSole;
    limitedCompanyFields.hidden = !showLimited;

    soleTraderInputs.forEach(function (input) {
      input.required = showSole;
      if (!showSole) clearFieldError(input);
    });
    limitedCompanyInputs.forEach(function (input) {
      input.required = showLimited;
      if (!showLimited) clearFieldError(input);
    });
  }

  if (businessType) {
    businessType.addEventListener("change", updateBusinessTypeFields);
    updateBusinessTypeFields();
  }

  /* =========================================================
     Live loan repayment calculator
     ========================================================= */
  const loanAmountInput = document.getElementById("loanAmount");
  const interestRateInput = document.getElementById("interestRate");
  const loanTermInput = document.getElementById("loanTerm");
  const repaymentOutput = document.getElementById("repaymentOutput");

  const currencyFormatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function calculateRepayment() {
    const principal = parseFloat(loanAmountInput.value) || 0;
    const annualRate = parseFloat(interestRateInput.value) || 0;
    const years = parseFloat(loanTermInput.value) || 0;

    if (principal <= 0 || years <= 0) {
      repaymentOutput.textContent = currencyFormatter.format(0);
      return;
    }

    const monthlyRate = annualRate / 100 / 12;
    const numPayments = years * 12;

    let monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = principal / numPayments;
    } else {
      const factor = Math.pow(1 + monthlyRate, numPayments);
      monthlyPayment = (principal * monthlyRate * factor) / (factor - 1);
    }

    repaymentOutput.textContent = currencyFormatter.format(monthlyPayment);
  }

  [loanAmountInput, interestRateInput, loanTermInput].forEach(function (input) {
    if (input) {
      input.addEventListener("input", calculateRepayment);
    }
  });
  calculateRepayment();

  /* =========================================================
     Repeatable authorised signatories
     ========================================================= */
  const signatoriesList = document.getElementById("signatoriesList");
  const addSignatoryBtn = document.getElementById("addSignatory");
  const signatoryTemplate = document.getElementById("signatoryTemplate");
  let signatoryCount = 0;

  function addSignatory() {
    signatoryCount += 1;
    const fragment = signatoryTemplate.content.cloneNode(true);
    const group = fragment.querySelector("[data-signatory]");
    const index = signatoryCount;

    const nameInput = group.querySelector(".sig-name");
    const roleInput = group.querySelector(".sig-role");
    const emailInput = group.querySelector(".sig-email");

    nameInput.id = "sigName" + index;
    roleInput.id = "sigRole" + index;
    emailInput.id = "sigEmail" + index;
    nameInput.name = "sigName" + index;
    roleInput.name = "sigRole" + index;
    emailInput.name = "sigEmail" + index;
    nameInput.required = true;
    roleInput.required = true;
    emailInput.required = true;

    group.querySelectorAll("label").forEach(function (label, i) {
      const inputs = [nameInput, roleInput, emailInput];
      label.setAttribute("for", inputs[i].id);
    });

    const errorEls = group.querySelectorAll(".field-error");
    errorEls[0].id = "sigName" + index + "-error";
    errorEls[1].id = "sigRole" + index + "-error";
    errorEls[2].id = "sigEmail" + index + "-error";
    nameInput.setAttribute("aria-describedby", errorEls[0].id);
    roleInput.setAttribute("aria-describedby", errorEls[1].id);
    emailInput.setAttribute("aria-describedby", errorEls[2].id);

    group.querySelector(".signatory-remove").addEventListener("click", function () {
      group.remove();
      renumberSignatories();
    });

    signatoriesList.appendChild(fragment);
    renumberSignatories();
  }

  function renumberSignatories() {
    const groups = signatoriesList.querySelectorAll("[data-signatory]");
    groups.forEach(function (group, i) {
      const signatoryNumber = i + 1;
      group.querySelector(".signatory-title").textContent = "Signatory " + signatoryNumber;
      group.querySelector(".signatory-remove").setAttribute("aria-label", "Remove Signatory " + signatoryNumber);
    });
  }

  if (addSignatoryBtn) {
    addSignatoryBtn.addEventListener("click", function () {
      addSignatory();
    });
  }
  // Start with one signatory group by default
  addSignatory();

  /* =========================================================
     Form validation
     ========================================================= */
  const businessInformationForm = document.getElementById("business-information");
  const signatoriesForm = document.getElementById("authorised-signatories");
  const contactForm = document.getElementById("contact-details");
  const sectionForms = [businessInformationForm, signatoriesForm, contactForm].filter(Boolean);
  const enquiryAccordion = document.getElementById("enquiryAccordion");
  const formStatus = document.getElementById("formStatus");
  const formSuccess = document.getElementById("formSuccess");
  const formReference = document.getElementById("formReference");
  const resetFormBtn = document.getElementById("resetForm");

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^[0-9+()\s-]{7,20}$/;
  const NAME_RE = /^\p{L}+(?:\s+\p{L}+)*$/u;

  function setFieldError(input, message) {
    const field = input.closest(".field");
    const errorEl = document.getElementById(input.getAttribute("aria-describedby"));
    if (field) field.classList.add("has-error");
    if (errorEl) errorEl.textContent = message;
    input.setAttribute("aria-invalid", "true");
  }

  function clearFieldError(input) {
    const describedBy = input.getAttribute("aria-describedby");
    const field = input.closest(".field");
    if (field) field.classList.remove("has-error");
    if (describedBy) {
      const errorEl = document.getElementById(describedBy);
      if (errorEl) errorEl.textContent = "";
    }
    input.removeAttribute("aria-invalid");
  }

  function validateRequired(input, label) {
    if (!input.value.trim()) {
      setFieldError(input, label + " is required.");
      return false;
    }
    clearFieldError(input);
    return true;
  }

  function validatePattern(input, regex, message, requiredIfFilled) {
    if (!input.value.trim()) {
      if (input.required) {
        setFieldError(input, "This field is required.");
        return false;
      }
      clearFieldError(input);
      return true;
    }
    if (!regex.test(input.value.trim())) {
      setFieldError(input, message);
      return false;
    }
    clearFieldError(input);
    return true;
  }

  function validateRequiredPattern(input, label, regex, message) {
    if (!input.value.trim()) return validateRequired(input, label);
    return validatePattern(input, regex, message);
  }

  function validateLiveField(input) {
    switch (input.id) {
      case "businessType":
        return validateRequired(input, "Business structure");
      case "tradingName":
        return validateRequired(input, "Trading name");
      case "utr":
        return validatePattern(input, /^\d{10}$/, "Enter a 10-digit UTR.");
      case "companyName":
        return validateRequired(input, "Registered company name");
      case "companiesHouseNumber":
        return validatePattern(input, /^\d{8}$/, "Enter an 8-digit Companies House number.");
      case "fullName":
        return validateRequiredPattern(input, "Full name", NAME_RE, "Use letters and spaces only for your full name.");
      case "email":
        return validateRequiredPattern(input, "Email address", EMAIL_RE, "Enter a valid email address.");
      case "phone":
        return validateRequiredPattern(input, "Phone number", PHONE_RE, "Enter a valid phone number.");
      case "message":
        return validateRequired(input, "This field");
      default:
        if (input.classList.contains("sig-name")) return validateRequired(input, "Signatory name");
        if (input.classList.contains("sig-role")) return validateRequired(input, "Signatory role");
        if (input.classList.contains("sig-email")) {
          return validateRequiredPattern(input, "Signatory email", EMAIL_RE, "Enter a valid email address.");
        }
        return true;
    }
  }

  function validateContactDetails() {
    let isValid = true;
    const fullName = document.getElementById("fullName");
    const email = document.getElementById("email");
    const phone = document.getElementById("phone");
    const message = document.getElementById("message");

    if (!validateRequiredPattern(fullName, "Full name", NAME_RE, "Use letters and spaces only for your full name.")) isValid = false;
    if (!validateRequiredPattern(email, "Email address", EMAIL_RE, "Enter a valid email address.")) isValid = false;
    if (!validateRequiredPattern(phone, "Phone number", PHONE_RE, "Enter a valid phone number.")) isValid = false;
    if (!validateRequired(message, "This field")) isValid = false;

    return isValid;
  }

  function focusFirstInvalid(panel) {
    const firstError = panel.querySelector('[aria-invalid="true"]');
    if (firstError) firstError.focus();
  }

  sectionForms.forEach(function (sectionForm) {
    sectionForm.addEventListener("input", function (event) {
      const input = event.target;
      if (!input.matches("input, select, textarea")) return;
      if (!input.value.trim() && !input.hasAttribute("aria-invalid")) return;
      validateLiveField(input);
    });

    sectionForm.addEventListener("change", function (event) {
      if (!event.target.matches("select")) return;
      validateLiveField(event.target);
    });

    sectionForm.addEventListener("focusout", function (event) {
      if (event.target.matches("input, select, textarea")) validateLiveField(event.target);
    });
  });

  [businessInformationForm, signatoriesForm].forEach(function (sectionForm) {
    if (sectionForm) {
      sectionForm.addEventListener("submit", function (event) {
        event.preventDefault();
      });
    }
  });

  if (contactForm) {
    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const isValid = validateContactDetails();

      if (!isValid) {
        formStatus.textContent = "Please fix the highlighted fields and try again.";
        formStatus.classList.add("is-visible");
        const firstError = document.getElementById("contact-details").querySelector('[aria-invalid="true"]');
        if (firstError) {
          const errorId = firstError.getAttribute("aria-describedby");
          const errorMessage = errorId ? document.getElementById(errorId) : null;
          if (errorMessage && errorMessage.textContent) {
            window.alert(errorMessage.textContent);
          }
          firstError.focus();
        }
        return;
      }

      formStatus.textContent = "";
      formStatus.classList.remove("is-visible");

      const reference = "BCB-" + Math.floor(100000 + Math.random() * 900000);
      formReference.textContent = "Reference: " + reference;

      sectionForms.forEach(function (sectionForm) {
        sectionForm.hidden = false;
      });
      enquiryAccordion.hidden = true;
      formSuccess.hidden = false;
      formSuccess.focus();
    });
  }

  if (resetFormBtn) {
    resetFormBtn.addEventListener("click", function () {
      sectionForms.forEach(function (sectionForm) {
        sectionForm.reset();
        sectionForm.hidden = false;
      });
      enquiryAccordion.hidden = false;
      formSuccess.hidden = true;

      // Clear dynamic signatories back to a single blank group
      signatoriesList.innerHTML = "";
      signatoryCount = 0;
      addSignatory();
      formStatus.textContent = "";
      formStatus.classList.remove("is-visible");

      updateBusinessTypeFields();
      calculateRepayment();
      openAccordionItem("loan-calculator-item");
      document.getElementById("loanAmount").focus();
    });
  }
})();
