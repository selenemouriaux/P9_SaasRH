/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import Bills from "../containers/Bills.js";

import router from "../app/Router.js";

jest.mock("../app/Store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
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
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      expect(windowIcon.classList.contains("active-icon")).toBe(true);
    });
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
  });

  // Tests unitaires
  describe("When I am on Bills Page and I click on the new bill button", () => {
    test("Then I should navigate to NewBill page", () => {
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
      const onNavigate = jest.fn();
      document.body.innerHTML = BillsUI({ data: bills });

      // When
      const billsContainer = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });
      const handleClickNewBill = jest.fn(billsContainer.handleClickNewBill);
      const newBillBtn = screen.getByTestId("btn-new-bill");
      newBillBtn.addEventListener("click", handleClickNewBill);
      userEvent.click(newBillBtn);

      // Then
      expect(handleClickNewBill).toHaveBeenCalled();
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["NewBill"]);
    });
  });

  describe("When I am on Bills Page and I click on the eye icon", () => {
    test("Then a modal should open", () => {
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
      const onNavigate = jest.fn();
      document.body.innerHTML = BillsUI({ data: bills });

      const billsContainer = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      // Mock jQuery modal
      $.fn.modal = jest.fn();

      // When
      const iconEye = screen.getAllByTestId("icon-eye")[0];
      const handleClickIconEye = jest.fn(() =>
        billsContainer.handleClickIconEye(iconEye)
      );
      iconEye.addEventListener("click", handleClickIconEye);
      userEvent.click(iconEye);

      // Then
      expect(handleClickIconEye).toHaveBeenCalled();
      expect($.fn.modal).toHaveBeenCalledWith("show");
    });
  });

  describe("When I am on Bills Page and bills are loading", () => {
    test("Then loading page should be displayed", () => {
      // Given - When
      document.body.innerHTML = BillsUI({ loading: true });

      // Then
      expect(screen.getAllByText("Loading...")).toBeTruthy();
    });
  });

  describe("When I am on Bills Page and there is an error", () => {
    test("Then error page should be displayed", () => {
      // Given - When
      document.body.innerHTML = BillsUI({ error: "error message" });

      // Then
      expect(screen.getAllByText("Erreur")).toBeTruthy();
    });
  });

  describe("When I am on Bills Page and I call getBills", () => {
    test("Then it should fetch bills from the store", async () => {
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

      const billsContainer = new Bills({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage,
      });

      // When
      const result = await billsContainer.getBills();

      // Then
      expect(result.length).toBe(4);
      expect(result[0].date).toBeDefined();
      expect(result[0].status).toBeDefined();
    });

    test("Then bills should be formatted correctly", async () => {
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

      const billsContainer = new Bills({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage,
      });

      // When
      const result = await billsContainer.getBills();

      // Then
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty("status");
    });

    test("Then it should handle corrupted date gracefully", async () => {
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

      const corruptedStore = {
        bills() {
          return {
            list() {
              return Promise.resolve([
                {
                  id: "corrupted",
                  date: "invalid-date",
                  status: "pending",
                },
              ]);
            },
          };
        },
      };

      const billsContainer = new Bills({
        document,
        onNavigate: jest.fn(),
        store: corruptedStore,
        localStorage: window.localStorage,
      });

      // When
      const result = await billsContainer.getBills();

      // Then
      expect(result.length).toBe(1);
      expect(result[0].date).toBe("invalid-date");
    });
  });
});

// Test d'intégration GET
describe("Given I am a user connected as Employee", () => {
  describe("When I navigate to Bills", () => {
    test("fetches bills from mock API GET", async () => {
      // Given
      localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "a@a" })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();

      // When
      window.onNavigate(ROUTES_PATH.Bills);

      // Then
      await waitFor(() => screen.getByText("Mes notes de frais"));
      const newBillBtn = await screen.getByTestId("btn-new-bill");
      expect(newBillBtn).toBeTruthy();
    });

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills");
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
            email: "a@a",
          })
        );
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.appendChild(root);
        router();
      });

      test("fetches bills from an API and fails with 404 message error", async () => {
        // Given
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });

        // When
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);

        // Then
        const message = await screen.getByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });

      test("fetches bills from an API and fails with 500 message error", async () => {
        // Given
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"));
            },
          };
        });

        // When
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);

        // Then
        const message = await screen.getByText(/Erreur 500/);
        expect(message).toBeTruthy();
      });
    });
  });
});
