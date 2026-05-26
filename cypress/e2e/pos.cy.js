describe("Điểm bán hàng (POS) & Thanh toán", () => {
  beforeEach(() => {
    // Đăng nhập trước mỗi bài test
    cy.visit("http://localhost:5173/login");
    cy.get('input[type="email"]').type("admin@cafe.com");
    cy.get('input[type="password"]').type("admin123");
    cy.get("button").contains("Đăng nhập").click();

    // Điều hướng tới trang POS (Trang chủ)
    cy.visit("http://localhost:5173/");
  });

  it("Nên thực hiện đầy đủ quy trình chọn bàn, đặt món và thanh toán hóa đơn", () => {
    // Stub hàm window.print trước khi thực hiện các hành động để tránh treo trình duyệt khi thanh toán
    cy.window().then((win) => {
      cy.stub(win, "print").as("windowPrint");
    });

    // 1. CHỌN BÀN TRỐNG (Ví dụ chọn Bàn 1)
    // Tìm bàn 1 trống (thông thường có chữ "Bàn 1" và trạng thái màu xanh/🟢)
    cy.contains("Bàn 1").should("be.visible").click();

    // Xác nhận giỏ hàng bên phải hiển thị cho Bàn 1
    cy.get(".w-1/3").contains("Bàn 1").should("be.visible");
    cy.get(".w-1/3").contains("Tạo đơn mới").should("be.visible");

    // 2. CHỌN MÓN TỪ THỰC ĐƠN
    // Tìm các món ăn có sẵn và click chọn món đầu tiên
    cy.get(".w-1/3").contains("Thực đơn").should("be.visible");
    
    // Click vào sản phẩm đầu tiên trong danh mục thực đơn
    cy.get(".grid.grid-cols-2.gap-2 button").first().click();

    // Xác nhận món đã được thêm vào giỏ hàng ("Món đã chọn")
    cy.get(".w-1/3").contains("Món đã chọn").should("be.visible");

    // Tăng số lượng bằng cách click nút "+"
    cy.get(".w-1/3").contains("+").click();

    // 3. THÊM GHI CHÚ VÀ GIẢM GIÁ
    cy.get('input[placeholder="Ghi chú đơn hàng..."]').type("Ít đường, nhiều đá");
    cy.get('input[placeholder="0"]').clear().type("5000"); // Giảm giá 5,000đ

    // 4. ĐẶT MÓN & TẠO ĐƠN
    cy.get("button").contains("Đặt món & Tạo đơn").click();

    // Xác nhận thông báo thành công
    cy.contains("Đã tạo đơn hàng").should("be.visible");

    // Bàn 1 bây giờ sẽ chuyển sang trạng thái "occupied" (Đang phục vụ) có vòng tròn đỏ 🔴
    cy.contains("Bàn 1").parents(".rounded-xl").contains("🔴").should("be.visible");

    // 5. THANH TOÁN ĐƠN HÀNG
    // Click lại Bàn 1 đang phục vụ
    cy.contains("Bàn 1").click();

    // Xác nhận hiển thị thông tin hóa đơn hiện tại
    cy.get(".w-1/3").contains("Đang phục vụ").should("be.visible");
    cy.get(".w-1/3").contains("Mã đơn:").should("be.visible");

    // Click nút "Thanh toán & In HĐ"
    cy.get("button").contains("Thanh toán & In HĐ").click();

    // Xác nhận thông báo thanh toán thành công
    cy.contains("Thanh toán thành công").should("be.visible");

    // Xác minh window.print đã được gọi (stub hoạt động tốt)
    cy.get("@windowPrint").should("be.calledOnce");

    // Bàn 1 trở lại trạng thái trống (màu xanh/🟢)
    cy.contains("Bàn 1").parents(".rounded-xl").contains("🟢").should("be.visible");
  });
});
