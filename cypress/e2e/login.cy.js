describe("Đăng nhập", () => {
  beforeEach(() => {
    cy.visit("http://localhost:5173/login");
  });

  it("Đăng nhập thất bại khi sai thông tin", () => {
    cy.get('input[type="email"]').type("wrong@cafe.com");
    cy.get('input[type="password"]').type("wrongpass");
    cy.get("button").contains("Đăng nhập").click();
    
    // Kiểm tra thông báo toast xuất hiện (thường chứa chữ 'Đăng nhập thất bại' hoặc tương tự từ server)
    cy.contains("thất bại", { matchCase: false }).should("be.visible");
    cy.url().should("include", "/login");
  });

  it("Đăng nhập thành công với tài khoản Admin", () => {
    cy.get('input[type="email"]').type("admin@cafe.com");
    cy.get('input[type="password"]').type("admin123");
    cy.get("button").contains("Đăng nhập").click();
    
    // Kiểm tra điều hướng về trang chủ/dashboard sau khi đăng nhập thành công
    cy.url().should("not.include", "/login");
  });
});