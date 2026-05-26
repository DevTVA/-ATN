describe("Quản lý sản phẩm (CRUD)", () => {
  beforeEach(() => {
    // Đăng nhập trước mỗi bài test
    cy.visit("http://localhost:5173/login");
    cy.get('input[type="email"]').type("admin@cafe.com");
    cy.get('input[type="password"]').type("admin123");
    cy.get("button").contains("Đăng nhập").click();
    
    // Điều hướng tới trang Sản phẩm
    cy.visit("http://localhost:5173/products");
  });

  it("Nên thực hiện đầy đủ quy trình CRUD sản phẩm", () => {
    const productName = "Trà Đào Cam Sả " + Date.now();
    const updatedName = productName + " Đặc Biệt";

    // 1. THÊM SẢN PHẨM MỚI
    cy.contains("Thêm sản phẩm").click();
    
    // Chọn Emoji (ví dụ chọn ly trà sữa 🧋 hoặc ly nước 🥤)
    cy.contains("🧋").click();
    
    // Nhập thông tin
    cy.get('input[placeholder="VD: Cà phê sữa đá"]').type(productName);
    cy.get('input[placeholder="30000"]').type("35000");
    cy.get('select').select("tra-sua"); // Chọn danh mục Trà sữa
    cy.get('textarea[placeholder="Mô tả ngắn về món..."]').type("Ngon ngọt mát lạnh sảng khoái");
    
    // Nhấp nút Thêm mới trong Modal
    cy.get('button').contains("Thêm mới").click();

    // Xác nhận đã lưu thành công thông qua toast và sự xuất hiện trên giao diện
    cy.contains("Đã thêm sản phẩm mới").should("be.visible");
    cy.contains(productName).should("be.visible");

    // 2. TÌM KIẾM SẢN PHẨM
    cy.get('input[placeholder="🔍 Tìm sản phẩm..."]').type(productName);
    cy.contains(productName).should("be.visible");

    // 3. SỬA SẢN PHẨM
    // Tìm thẻ card chứa sản phẩm đó và nhấn "Sửa"
    cy.contains(productName)
      .parents(".card")
      .contains("Sửa")
      .click();

    // Thay đổi thông tin sản phẩm
    cy.get('input[placeholder="VD: Cà phê sữa đá"]').clear().type(updatedName);
    cy.get('input[placeholder="30000"]').clear().type("40000");
    cy.get('button').contains("Cập nhật").click();

    // Kiểm tra thông báo toast và thông tin mới
    cy.contains("Đã cập nhật sản phẩm").should("be.visible");
    cy.contains(updatedName).should("be.visible");
    // Kiểm tra giá tiền định dạng VNĐ (40.000đ hoặc 40.000)
    cy.contains("40.000").should("be.visible");

    // 4. XÓA SẢN PHẨM
    // Lắng nghe sự kiện window:confirm để đảm bảo Cypress tự động bấm OK khi hiện popup xác nhận xóa
    const stub = cy.stub();
    cy.on("window:confirm", stub);

    cy.contains(updatedName)
      .parents(".card")
      .find(".btn-danger")
      .click()
      .then(() => {
        expect(stub.getCall(0)).to.be.calledWith(`Xoá sản phẩm "${updatedName}"?`);
      });

    // Xác nhận xóa thành công qua toast và việc sản phẩm biến mất khỏi giao diện
    cy.contains("Đã xoá sản phẩm").should("be.visible");
    cy.contains(updatedName).should("not.exist");
  });
});
