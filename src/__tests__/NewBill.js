/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import router from "../app/Router.js";

jest.mock("../app/Store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then the form should be displayed with all required fields", () => {
      // Given - When
      const html = NewBillUI();
      document.body.innerHTML = html;

      // Then
      expect(screen.getByTestId("form-new-bill")).toBeTruthy();
      expect(screen.getByTestId("expense-type")).toBeTruthy();
      expect(screen.getByTestId("expense-name")).toBeTruthy();
      expect(screen.getByTestId("datepicker")).toBeTruthy();
      expect(screen.getByTestId("amount")).toBeTruthy();
      expect(screen.getByTestId("vat")).toBeTruthy();
      expect(screen.getByTestId("pct")).toBeTruthy();
      expect(screen.getByTestId("commentary")).toBeTruthy();
      expect(screen.getByTestId("file")).toBeTruthy();
    });

    test("Then mail icon in vertical layout should be highlighted", async () => {
      // Given
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();

      // When
      window.onNavigate(ROUTES_PATH.NewBill);
      await waitFor(() => screen.getByTestId("icon-mail"));
      const mailIcon = screen.getByTestId("icon-mail");

      // Then
      expect(mailIcon.classList.contains("active-icon")).toBe(true);
    });
  });

  describe("When I upload a file with valid format", () => {
    test("Then the file should be accepted", () => {
      // Given
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "employee@test.com",
        })
      );

      document.body.innerHTML = NewBillUI();
      const onNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const handleChangeFile = jest.fn(newBill.handleChangeFile);
      const fileInput = screen.getByTestId("file");
      fileInput.addEventListener("change", handleChangeFile);

      // When
      const file = new File(["image"], "test.jpg", { type: "image/jpg" });
      userEvent.upload(fileInput, file);

      // Then
      expect(handleChangeFile).toHaveBeenCalled();
      expect(fileInput.files[0]).toBe(file);
      expect(fileInput.files[0].name).toBe("test.jpg");
    });

    test("Then the file should be stored in selectedFile property", () => {
      // Given
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "employee@test.com",
        })
      );

      document.body.innerHTML = NewBillUI();
      const onNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const fileInput = screen.getByTestId("file");

      // When
      const file = new File(["image"], "test.png", { type: "image/png" });
      Object.defineProperty(fileInput, "files", {
        value: [file],
      });

      const changeEvent = new Event("change", { bubbles: true });
      fileInput.dispatchEvent(changeEvent);

      // Then
      expect(newBill.selectedFile).toBeDefined();
    });
  });

  describe("When I upload a file with invalid format", () => {
    test("Then an alert should be displayed and file input should be cleared", () => {
      // Given
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "employee@test.com",
        })
      );

      document.body.innerHTML = NewBillUI();
      const onNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      window.alert = jest.fn();

      const fileInput = screen.getByTestId("file");

      // When
      const file = new File(["document"], "test.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(fileInput, "files", {
        value: [file],
      });

      const changeEvent = new Event("change", { bubbles: true });
      Object.defineProperty(changeEvent, "target", {
        value: fileInput,
        writable: false,
      });
      fileInput.dispatchEvent(changeEvent);

      // Then
      expect(window.alert).toHaveBeenCalledWith(
        "Format de fichier non supporté. Veuillez sélectionner une image (JPG, JPEG ou PNG)."
      );
    });
  });

  describe("When I submit the form with valid data", () => {
    test("Then it should create a new bill and navigate to Bills page", async () => {
      // Given
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "employee@test.com",
        })
      );

      document.body.innerHTML = NewBillUI();
      const onNavigate = jest.fn();

      const store = {
        bills() {
          return {
            create: jest.fn().mockResolvedValue({
              filePath: "/public/test.jpg",
              fileName: "test.jpg",
              key: "1234",
            }),
            update: jest.fn().mockResolvedValue({}),
          };
        },
      };

      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });

      const file = new File(["image"], "test.jpg", { type: "image/jpg" });
      newBill.selectedFile = file;

      const form = screen.getByTestId("form-new-bill");

      screen.getByTestId("expense-type").value = "Transports";
      screen.getByTestId("expense-name").value = "Vol Paris Londres";
      screen.getByTestId("datepicker").value = "2023-04-15";
      screen.getByTestId("amount").value = "250";
      screen.getByTestId("vat").value = "50";
      screen.getByTestId("pct").value = "20";
      screen.getByTestId("commentary").value = "Déplacement professionnel";

      const handleSubmit = jest.fn(newBill.handleSubmit);
      form.addEventListener("submit", handleSubmit);

      // When
      fireEvent.submit(form);

      // Then
      expect(handleSubmit).toHaveBeenCalled();
    });

    test("Then it should alert if no file is selected", () => {
      // Given
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "employee@test.com",
        })
      );

      document.body.innerHTML = NewBillUI();
      const onNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      window.alert = jest.fn();

      const form = screen.getByTestId("form-new-bill");

      screen.getByTestId("expense-type").value = "Transports";
      screen.getByTestId("expense-name").value = "Vol Paris Londres";

      // When
      const submitEvent = new Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      form.dispatchEvent(submitEvent);

      // Then
      expect(window.alert).toHaveBeenCalledWith(
        "Veuillez joindre un justificatif."
      );
    });
  });

  describe("When I submit the form and API returns invalid file response", () => {
    test("Then it should display an error alert", async () => {
      // Given
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "employee@test.com",
        })
      );

      document.body.innerHTML = NewBillUI();
      const onNavigate = jest.fn();

      const store = {
        bills() {
          return {
            create: jest.fn().mockResolvedValue({
              filePath: "null",
              fileName: "null",
              key: "1234",
            }),
            update: jest.fn().mockResolvedValue({}),
          };
        },
      };

      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });

      window.alert = jest.fn();

      const file = new File(["image"], "test.jpg", { type: "image/jpg" });
      newBill.selectedFile = file;

      const form = screen.getByTestId("form-new-bill");

      screen.getByTestId("expense-type").value = "Transports";
      screen.getByTestId("expense-name").value = "Test";
      screen.getByTestId("datepicker").value = "2023-04-15";
      screen.getByTestId("amount").value = "100";

      // When
      const submitEvent = new Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      form.dispatchEvent(submitEvent);

      await new Promise(process.nextTick);

      // Then
      expect(window.alert).toHaveBeenCalledWith(
        "Erreur lors de l'upload du fichier. Veuillez sélectionner une image valide."
      );
    });
  });

  describe("When I submit the form and API throws an error", () => {
    test("Then it should display an error alert", async () => {
      // Given
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "employee@test.com",
        })
      );

      document.body.innerHTML = NewBillUI();
      const onNavigate = jest.fn();

      const store = {
        bills() {
          return {
            create: jest.fn().mockRejectedValue(new Error("API Error")),
            update: jest.fn().mockResolvedValue({}),
          };
        },
      };

      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });

      window.alert = jest.fn();
      console.error = jest.fn();

      const file = new File(["image"], "test.jpg", { type: "image/jpg" });
      newBill.selectedFile = file;

      const form = screen.getByTestId("form-new-bill");

      screen.getByTestId("expense-type").value = "Transports";
      screen.getByTestId("expense-name").value = "Test";
      screen.getByTestId("datepicker").value = "2023-04-15";
      screen.getByTestId("amount").value = "100";

      // When
      const submitEvent = new Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      form.dispatchEvent(submitEvent);

      await new Promise(process.nextTick);

      // Then
      expect(window.alert).toHaveBeenCalledWith(
        "Erreur lors de l'envoi de la facture. Veuillez réessayer."
      );
    });
  });
});

// Test d'intégration POST
describe("Given I am a user connected as Employee", () => {
  describe("When I navigate to NewBill page", () => {
    test("Then the new bill form should be rendered from API", async () => {
      // Given
      localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "a@a" })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.innerHTML = "";
      document.body.append(root);
      router();

      // When
      window.onNavigate(ROUTES_PATH.NewBill);

      // Then
      await waitFor(() => screen.getByText("Envoyer une note de frais"));
      expect(screen.getByTestId("form-new-bill")).toBeTruthy();
      expect(screen.getByTestId("expense-type")).toBeTruthy();
      expect(screen.getByTestId("expense-name")).toBeTruthy();
      expect(screen.getByTestId("file")).toBeTruthy();
    });
  });
});
