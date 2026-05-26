describe("Quản lý bàn (Sơ đồ bàn)", () => {
  beforeEach(() => {
    // Đăng nhập trước mỗi bài test
    cy.visit("http://localhost:5173/login");
    cy.get('input[type="email"]').type("admin@cafe.com");
    cy.get('input[type="password"]').type("admin123");
    cy.get("button").contains("Đăng nhập").click();

    // Điều hướng tới trang Sơ đồ bàn
    cy.visit("http://localhost:5173/tables");
  });

  it("Nên thực hiện toàn bộ quy trình quản lý bàn", () => {
    const tableNumber = 99; // Dùng số bàn 99 làm thử nghiệm
    const tableName = "Bàn VIP bờ sông";
    const updatedName = "Bàn VIP sân thượng";

    // 1. THÊM BÀN MỚI
    cy.contains("Thêm bàn").click();
    
    // Điền thông tin bàn mới
    cy.get('input[type="number"]').eq(0).clear().type(tableNumber.toString()); // Ô Số bàn
    cy.get('input[type="number"]').eq(1).clear().type("6");                   // Ô Sức chứa
    cy.get('input[placeholder="VD: Bàn góc, Bàn ngoài trời..."]').type(tableName);
    
    cy.get('button').contains("Thêm bàn").click();

    // Xác nhận bàn mới được thêm
    cy.contains("Đã thêm bàn mới").should("be.visible");
    cy.contains(`Bàn ${tableNumber}`).should("be.visible");

    // 2. THAY ĐỔI TRẠNG THÁI SANG "ĐÃ ĐẶT" (RESERVED)
    // Click vào bàn vừa tạo để mở Modal Chi tiết
    cy.contains(`Bàn ${tableNumber}`).click();
    
    // Nhấp vào nút "Đánh dấu đặt trước"
    cy.contains("Đánh dấu đặt trước").click();
    cy.contains(`Cập nhật bàn ${tableNumber}: Đã đặt`).should("be.visible");

    // 3. SỬA THÔNG TIN BÀN
    // Click lại bàn để mở chi tiết và bấm sửa
    cy.contains(`Bàn ${tableNumber}`).click();
    cy.contains("Sửa thông tin").click();

    // Đổi sức chứa lên 8 và đổi tên/ghi chú
    cy.get('input[type="number"]').eq(1).clear().type("8");
    cy.get('input[placeholder="VD: Bàn góc, Bàn ngoài trời..."]').clear().type(updatedName);
    
    cy.get('button').contains("Cập nhật").click();
    cy.contains("Đã cập nhật bàn").should("be.visible");

    // Click vào bàn để kiểm tra thông tin cập nhật (sức chứa 8 người)
    cy.contains(`Bàn ${tableNumber}`).click();
    cy.contains("8 người").should("be.visible");
    cy.contains("Đóng").click();

    // 4. XÓA BÀN
    cy.contains(`Bàn ${tableNumber}`).click();
    
    const stub = cy.stub();
    cy.on("window:confirm", stub);

    cy.contains("Xoá").click().then(() => {
      expect(stub.getCall(0)).to.be.calledWith(`Xoá bàn ${tableNumber}?`);
    });

    cy.contains("Đã xoá bàn").should("be.visible");
    cy.contains(`Bàn ${tableNumber}`).should("not.exist");
  });
});
