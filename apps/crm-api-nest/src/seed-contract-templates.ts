// Contract template bodies for the seed — the real HỢP ĐỒNG THI CÔNG paperwork
// ("01. MẪU FILE HỒ SƠ/Mau Hop Dong.docx") transcribed into the CRM's template
// model, article for article (Điều 1–12).
//
// What the .docx leaves blank for a typist, this fills with merge chips:
//   • Bên A         → client, client.address, client.tax_id, client.rep,
//                     client.rep_title, client.phone (GET /projects/:id include)
//   • Bên B         → company.* (the company profile, settings → Thông tin công ty)
//   • công trình    → project_code, project_name, site_name, site_address
//   • tiến độ       → start_date, duration_days
//   • tiền          → the chốt quote: value, value_before_tax, vat_rate,
//                     value_in_words, plus the line-items block for Điều 1's table
// The Quốc hiệu preamble and the two signature blocks are NOT in the body —
// they come from the template's show_national flag and SignatureBlocks.
//
// Still typed by hand, because the CRM has no column for it: the giấy ủy quyền
// reference. It prints as the same dotted blank the .docx uses.
//
// Bodies are Lexical editorState JSON, opaque to the backend — crm-web renders
// them (utils/lexical-build). Minimal builders so the templates stay readable
// instead of pasted JSON; `merge-field` chips resolve at render time.
type Lex = Record<string, unknown>;

const lexBlock = (type: string, children: Lex[], extra: Lex = {}): Lex => ({
  type,
  version: 1,
  direction: "ltr",
  format: "",
  indent: 0,
  children,
  ...extra,
});
const txt = (text: string): Lex => ({
  type: "text",
  version: 1,
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
  text,
});
const mergeField = (token: string, label: string): Lex => ({
  type: "merge-field",
  version: 1,
  detail: 0,
  format: 0,
  mode: "token",
  style: "",
  text: label,
  token,
});
const para = (...children: Lex[]) => lexBlock("paragraph", children);
const heading = (text: string) =>
  lexBlock("heading", [txt(text)], { tag: "h2" });
/** The auto báo giá block — expands to the deal quote's pricing at render. */
const LINE_ITEMS: Lex = { type: "line-items", version: 1 };
const lexDoc = (...blocks: Lex[]) =>
  JSON.stringify({ root: lexBlock("root", blocks) });

/** Shorthand for the many plain-text clauses. */
const clause = (text: string) => para(txt(text));

/**
 * The contract body. `scope` is the one phrase that differs per template — what
 * Bên B is engaged to do ("thi công hạng mục", "cung cấp dịch vụ vệ sinh"); every
 * article below is shared, exactly as in the .docx.
 */
export const contractBody = (scope: string) =>
  lexDoc(
    // ── Căn cứ ─────────────────────────────────────────────────────────────
    clause(
      "Căn cứ Luật Thương mại số 36/2005/QH11 do Quốc hội nước Cộng hòa Xã hội chủ nghĩa Việt Nam ban hành ngày 27/6/2005, có hiệu lực từ ngày 01/01/2006."
    ),
    clause(
      "Căn cứ Bộ luật Dân sự số 91/2015/QH13 do Quốc hội nước Cộng hòa Xã hội chủ nghĩa Việt Nam ban hành ngày 24/11/2015, có hiệu lực từ ngày 01/01/2017."
    ),
    para(
      txt("Căn cứ bảng báo giá "),
      mergeField("project_name", "Tên công trình"),
      txt(" tại "),
      mergeField("site_address", "Địa chỉ thi công"),
      txt(" do "),
      mergeField("company.name", "Bên B: Tên"),
      txt(" lập.")
    ),
    clause("Căn cứ vào nhu cầu và khả năng của hai bên."),
    para(
      txt("Hôm nay, ngày "),
      mergeField("signed_date", "Ngày ký"),
      txt(", chúng tôi gồm có:")
    ),

    // ── Hai bên ────────────────────────────────────────────────────────────
    heading("BÊN A (CHỦ ĐẦU TƯ)"),
    para(txt("Tên đơn vị: "), mergeField("client", "Bên A: Tên")),
    para(txt("Địa chỉ: "), mergeField("client.address", "Bên A: Địa chỉ")),
    para(txt("Mã số thuế: "), mergeField("client.tax_id", "Bên A: MST")),
    para(txt("Điện thoại: "), mergeField("client.phone", "Bên A: Điện thoại")),
    para(txt("Đại diện là: "), mergeField("client.rep", "Bên A: Đại diện")),
    para(txt("Chức vụ: "), mergeField("client.rep_title", "Bên A: Chức vụ")),
    clause("(Sau đây được gọi là “Bên A”)"),

    heading("BÊN B (NHÀ THẦU)"),
    para(txt("Tên đơn vị: "), mergeField("company.name", "Bên B: Tên")),
    para(txt("Đại diện: "), mergeField("company.rep", "Bên B: Đại diện")),
    para(txt("Chức vụ: "), mergeField("company.rep_title", "Bên B: Chức vụ")),
    para(txt("Địa chỉ: "), mergeField("company.address", "Bên B: Địa chỉ")),
    para(
      txt("Tài khoản: "),
      mergeField("company.bank_account", "Bên B: Số tài khoản"),
      txt(" tại "),
      mergeField("company.bank_name", "Bên B: Ngân hàng"),
      txt(" - "),
      mergeField("company.bank_branch", "Bên B: Chi nhánh/PGD")
    ),
    para(txt("Điện thoại: "), mergeField("company.phone", "Bên B: Điện thoại")),
    para(txt("Mã số thuế: "), mergeField("company.tax_id", "Bên B: MST")),
    clause(
      "(Theo Giấy ủy quyền số ……………… ngày ……/……/……… của Giám đốc Công ty)"
    ),
    clause("(Sau đây được gọi là “Bên B”)"),
    clause(
      "Sau khi bàn bạc thỏa thuận, hai bên cùng thống nhất ký kết hợp đồng với các điều khoản sau:"
    ),

    // ── Điều 1 ─────────────────────────────────────────────────────────────
    heading("ĐIỀU 1: NỘI DUNG HỢP ĐỒNG"),
    para(
      txt("Bên A đồng ý giao và Bên B đồng ý nhận thực hiện " + scope + " "),
      mergeField("project_code", "Mã công trình"),
      txt(" - "),
      mergeField("project_name", "Tên công trình"),
      txt(" tại "),
      mergeField("site_name", "Địa điểm thi công"),
      txt(", "),
      mergeField("site_address", "Địa chỉ thi công"),
      txt(".")
    ),
    clause("Bên B cung cấp cho Bên A những dịch vụ với nội dung như sau:"),
    LINE_ITEMS,
    para(
      txt("Giá trị hợp đồng đã bao gồm thuế VAT "),
      mergeField("vat_rate", "Thuế suất VAT"),
      txt(": "),
      mergeField("value", "Giá trị (đã gồm VAT)"),
      txt(" (Bằng chữ: "),
      mergeField("value_in_words", "Giá trị bằng chữ"),
      txt(").")
    ),
    clause(
      "Loại hợp đồng: Trọn gói, bao gồm toàn bộ chi phí liên quan để hoàn thành công việc mà không tính thêm các chi phí phát sinh khác."
    ),

    // ── Điều 2 ─────────────────────────────────────────────────────────────
    heading("ĐIỀU 2: CHẤT LƯỢNG"),
    clause(
      "Bên B đảm bảo thực hiện thi công với chất lượng đáp ứng yêu cầu của Bên A và Ban Quản lý Tòa nhà đã được hai bên trao đổi, thống nhất. Bên B đảm bảo thi công các việc đã liệt kê trong bảng báo giá để bàn giao cho Bên A đúng thời hạn."
    ),
    clause(
      "Bên B chịu trách nhiệm thi công các hạng mục đúng theo các công tác liệt kê trong bảng báo giá được duyệt và các công việc thuộc phạm vi trách nhiệm của Bên B được nêu tại Điều 1 của Hợp đồng này, đảm bảo tính bền vững và chính xác theo quy chuẩn, tiêu chuẩn Việt Nam, các quy phạm pháp luật hiện hành và yêu cầu từ Bên A."
    ),
    clause(
      "Bên B phải thực hiện các biện pháp đảm bảo an toàn lao động, bảo vệ môi trường và phòng chống cháy nổ trong quá trình thi công, thực hiện chế độ giám sát thi công theo đúng quy định hiện hành."
    ),

    // ── Điều 3 ─────────────────────────────────────────────────────────────
    heading("ĐIỀU 3: THỜI GIAN THỰC HIỆN, NHÂN LỰC, ĐỊA ĐIỂM"),
    para(
      txt(
        "Thời gian thi công: tính từ ngày Ban Quản lý duyệt giấy phép thi công đến ngày hoàn thành công việc là "
      ),
      mergeField("duration_days", "Số ngày thi công"),
      txt(" ngày.")
    ),
    para(
      txt("Thời gian bắt đầu thi công: ngày "),
      mergeField("start_date", "Ngày khởi công")
    ),
    clause("Thời gian hoàn thành bàn giao công trình: ngày ……/……/………"),
    para(
      txt("Địa điểm thi công: "),
      mergeField("site_name", "Địa điểm thi công"),
      txt(", "),
      mergeField("site_address", "Địa chỉ thi công")
    ),

    // ── Điều 4 ─────────────────────────────────────────────────────────────
    heading("ĐIỀU 4: HÌNH THỨC THANH TOÁN"),
    para(
      txt(
        "Đợt 1: Bên A thanh toán cho Bên B 80% giá trị hợp đồng trước thuế, tương đương "
      ),
      mergeField("value_before_tax", "Giá trị trước thuế"),
      txt(
        " x 80%, trong vòng 03 ngày làm việc sau khi ký hợp đồng. Hồ sơ thanh toán bao gồm: Hợp đồng này đã được ký hợp lệ; Bảng đề nghị thanh toán tạm ứng đợt 1."
      )
    ),
    clause(
      "Đợt 2: Sau khi Bên B hoàn tất toàn bộ hạng mục công việc, được Bên A và Ban Quản lý Tòa nhà đồng ý nghiệm thu xác nhận theo khối lượng thực tế, Bên A thanh toán dứt điểm cho Bên B giá trị hợp đồng còn lại trừ đi giá trị tạm ứng đợt 1 trong vòng 07 ngày làm việc kể từ ngày Bên A nhận đầy đủ hồ sơ đề nghị thanh toán hợp lệ của Bên B. Hồ sơ thanh toán bao gồm: Hóa đơn GTGT hợp lệ của Bên B; Biên bản nghiệm thu giữa Bên A và Bên B; Biên bản nghiệm thu có xác nhận của Ban Quản lý TTTM; Bảng giá trị quyết toán theo khối lượng thực tế; Đề nghị thanh toán đợt 2."
    ),
    clause(
      "Bên A sẽ thanh toán cho Bên B bằng chuyển khoản theo thông tin tài khoản như sau:"
    ),
    para(
      txt("Tên người nhận/chủ tài khoản: "),
      mergeField("company.name", "Bên B: Tên")
    ),
    para(
      txt("Địa chỉ người nhận: "),
      mergeField("company.address", "Bên B: Địa chỉ")
    ),
    para(
      txt("Tên ngân hàng: "),
      mergeField("company.bank_name", "Bên B: Ngân hàng"),
      txt(" - "),
      mergeField("company.bank_branch", "Bên B: Chi nhánh/PGD")
    ),
    para(
      txt("Số tài khoản: "),
      mergeField("company.bank_account", "Bên B: Số tài khoản")
    ),

    // ── Điều 5 ─────────────────────────────────────────────────────────────
    heading("ĐIỀU 5: QUYỀN VÀ TRÁCH NHIỆM CỦA HAI BÊN"),
    clause("5.1. Trách nhiệm của Bên A:"),
    clause(
      "- Chịu trách nhiệm thanh toán đầy đủ cho Bên B theo Điều 4 của hợp đồng."
    ),
    clause(
      "- Phối hợp chặt chẽ với Bên B trong quá trình thực hiện Hợp đồng để không làm ảnh hưởng đến tiến độ của công trình."
    ),
    clause("5.2. Trách nhiệm của Bên B:"),
    clause(
      "- Chịu mọi trách nhiệm trước pháp luật về hoạt động cung cấp dịch vụ thi công, sửa chữa và lắp đặt công trình và các hoạt động khác có liên quan cho Bên A theo Hợp đồng này."
    ),
    clause(
      "- Trong suốt thời hạn của Hợp đồng, Bên B đảm bảo có đầy đủ tư cách cũng như quyền pháp lý để cung cấp dịch vụ cho Bên A theo Hợp đồng này, đảm bảo hoạt động của Bên B tuân thủ đầy đủ quy định hiện hành của pháp luật về các loại giấy phép (nếu có). Bên B sẽ chịu mọi trách nhiệm liên quan bao gồm nhưng không giới hạn trách nhiệm giải quyết các khiếu nại, yêu cầu của bên thứ ba liên quan đến giấy phép (nếu có) và bất kỳ khiếu nại nào khác trong quá trình Bên B cung cấp dịch vụ; bồi thường thiệt hại cho Bên A và/hoặc bên thứ ba (nếu có) do các hành vi vi phạm của mình gây ra."
    ),
    clause(
      "- Đề ra, duy trì và giám sát mọi quy trình, chịu trách nhiệm về an toàn lao động do pháp luật Việt Nam quy định có liên quan đến công việc được thực hiện. Chịu toàn bộ trách nhiệm nếu để xảy ra hỏa hoạn hoặc bất cứ thiệt hại nào do công nhân của Bên B hoặc bên thứ ba liên quan đến Bên B gây ra trong quá trình thi công. Đảm bảo không làm ảnh hưởng đến kết cấu công trình trong quá trình thi công."
    ),
    clause("- Thực hiện đúng theo Hợp đồng đã ký."),
    clause(
      "- Đảm bảo cung cấp dịch vụ thi công kịp thời và đúng chất lượng như đã thỏa thuận."
    ),
    clause(
      "- Bên B phải đảm bảo chuẩn bị đủ các trang thiết bị cần thiết cho công tác phá dỡ và thi công hoàn trả mặt bằng, đáp ứng theo yêu cầu về chất lượng kỹ thuật hoặc yêu cầu khác mà Bên A thông báo."
    ),
    clause(
      "- Đảm bảo toàn bộ nhân viên của mình chấp hành đúng và đầy đủ nội quy làm việc, quy định vệ sinh môi trường và phòng cháy chữa cháy của Tòa nhà nơi thi công và của Bên A trong suốt thời gian làm việc tại đây."
    ),
    clause(
      "- Đảm bảo công nhân thực hiện dịch vụ mặc đồng phục gọn gàng và có đủ chuyên môn, nghiệp vụ thực hiện thi công."
    ),
    clause(
      "- Đảm bảo thi công an toàn tuyệt đối cho người và công trình. Bên B chịu hoàn toàn trách nhiệm bồi thường thiệt hại theo quy định của pháp luật trong trường hợp xảy ra tai nạn trong quá trình thực hiện công việc."
    ),
    clause(
      "- Chịu trách nhiệm với mọi mất mát hư hỏng thực tế về tài sản của Bên A do nhân viên của Bên B gây ra trong khi đang làm các công việc được nêu ở hợp đồng này tại nơi làm việc của Bên A."
    ),
    clause("5.3. Trách nhiệm chung:"),
    clause(
      "- Trên tinh thần hợp tác, hai bên cam kết thực hiện đúng và đủ các điều khoản đã ghi trong hợp đồng này. Các bên không được đơn phương thay đổi hoặc hủy bỏ điều khoản của hợp đồng, bên nào vi phạm sẽ hoàn toàn chịu trách nhiệm trước pháp luật và bồi thường toàn bộ thiệt hại phát sinh cho bên còn lại."
    ),
    clause(
      "- Trong quá trình thực hiện, nếu có vấn đề phát sinh hai bên cùng nhau thương lượng giải quyết trên tinh thần tôn trọng quyền lợi của nhau. Trường hợp hai bên không tự thỏa thuận được sẽ thống nhất chuyển vụ việc tới Tòa án có thẩm quyền để giải quyết theo quy định của pháp luật. Bên thua kiện chịu hoàn toàn án phí."
    ),
    clause(
      "- Bên nào vi phạm một trong những điều khoản đã được thỏa thuận trong Hợp đồng này sẽ phải đền bù cho bên kia những thiệt hại thực tế do sự vi phạm hợp đồng của mình gây ra."
    ),
    clause(
      "- Trong trường hợp một trong hai bên không triển khai thực hiện Hợp đồng hay chấm dứt Hợp đồng không đúng như thỏa thuận sẽ phải bồi thường toàn bộ thiệt hại phát sinh (nếu có) cho bên còn lại, đồng thời chịu phạt vi phạm tương đương 8% giá trị hợp đồng."
    ),
    clause(
      "- Việc ký kết hợp đồng này không được hiểu là bất kỳ hay tất cả nhân viên của Bên B, dù là nhân viên cấp quản lý, được Bên B giao nhiệm vụ cung cấp dịch vụ thi công theo Hợp đồng này là người lao động của Bên A. Bên B với tư cách là người sử dụng lao động của các nhân viên đó, chịu trách nhiệm đảm bảo các điều kiện làm việc và các trách nhiệm khác đối với các nhân viên đó theo quy định của pháp luật về lao động."
    ),

    // ── Điều 6 ─────────────────────────────────────────────────────────────
    heading("ĐIỀU 6: NGHĨA VỤ BẢO MẬT"),
    clause(
      "Mỗi Bên theo đây thừa nhận rằng mọi thông tin nhận được từ Bên kia liên quan tới việc ký kết và thực hiện Hợp đồng này là Thông Tin Mật. Mỗi Bên cam kết sẽ bảo mật nghiêm ngặt các Thông Tin Mật và chỉ tiết lộ cho người lao động, cán bộ, đại lý, nhà thầu phụ hay tư vấn chuyên nghiệp trực tiếp tiến hành các công việc để thực hiện các quyền và nghĩa vụ của Bên đó theo Hợp đồng, và có nghĩa vụ đảm bảo những người trên tuân thủ nghiêm ngặt các quy định về bảo mật. Mỗi Bên sẽ chỉ tiết lộ Thông Tin Mật cho các cơ quan nhà nước có thẩm quyền nhằm mục đích điều tra hình sự, điều tra cạnh tranh hoặc các cuộc điều tra khác mà pháp luật yêu cầu. Bên nhận Thông Tin Mật hoàn toàn chịu trách nhiệm về việc vi phạm nghĩa vụ bảo mật và sẽ phải bồi thường mọi tổn thất và thiệt hại cho Bên kia. Nghĩa vụ bảo mật này có hiệu lực trong thời hạn ba (03) năm kể từ ngày ký Hợp đồng."
    ),

    // ── Điều 7 ─────────────────────────────────────────────────────────────
    heading("ĐIỀU 7: BẢO HIỂM"),
    clause("Bên B sẽ chịu trách nhiệm mua các loại bảo hiểm sau:"),
    clause(
      "- Bảo hiểm bồi thường cho người lao động của bên cung cấp dịch vụ thi công (bao gồm cả nhân viên của nhà thầu phụ)."
    ),
    clause(
      "- Bảo hiểm trách nhiệm chung toàn diện, bao gồm sự đảm bảo bồi thường cho các nghĩa vụ theo Hợp đồng này với giới hạn trách nhiệm do bên sử dụng dịch vụ thi công và/hoặc bên tư vấn khuyến nghị."
    ),
    clause(
      "- Bảo hiểm trách nhiệm nghề nghiệp hoặc bảo hiểm trách nhiệm do sai sót."
    ),

    // ── Điều 8 ─────────────────────────────────────────────────────────────
    heading("ĐIỀU 8: BẤT KHẢ KHÁNG"),
    clause(
      "Không Bên nào phải chịu trách nhiệm đối với bất kỳ vi phạm hoặc không thực hiện nào theo Hợp đồng này nếu sự vi phạm hoặc không thực hiện đó là kết quả của hoặc gây ra bởi một Sự Kiện Bất Khả Kháng."
    ),
    clause(
      "“Sự Kiện Bất Khả Kháng” có nghĩa là sự kiện không nằm trong sự kiểm soát hợp lý của Bên chịu ảnh hưởng và Bên đó không thể lường trước và tránh được một cách hợp lý, bao gồm chiến tranh, đe dọa chiến tranh, khủng bố, bạo loạn, sự can thiệp về quân sự, khởi nghĩa, lũ lụt, lốc xoáy, động đất, sấm sét, bão, cháy, đình công, cấm vận, dịch bệnh."
    ),
    clause(
      "Bên viện dẫn Sự Kiện Bất Khả Kháng phải ngay lập tức thông báo cho Bên kia bằng văn bản về sự kiện và khoảng thời gian tồn tại của nó, không muộn hơn bốn mươi tám (48) giờ sau khi phát hiện. Việc thực hiện nghĩa vụ của Bên đó, trong phạm vi bị ảnh hưởng, sẽ được tạm hoãn trong thời gian sự kiện xảy ra. Mặc dù vậy, mỗi Bên sẽ nỗ lực tối đa để thực hiện nghĩa vụ của mình theo Hợp đồng này."
    ),
    clause(
      "Trường hợp Sự Kiện Bất Khả Kháng kéo dài trên bốn mươi lăm (45) ngày kể từ ngày có thông báo thì một Bên có thể chấm dứt Hợp đồng này ngay lập tức bằng cách gửi thông báo bằng văn bản cho Bên còn lại."
    ),

    // ── Điều 9 ─────────────────────────────────────────────────────────────
    heading("ĐIỀU 9: BỒI THƯỜNG"),
    clause(
      "- Bên B bảo đảm rằng mình sẽ tuân thủ mọi quy định của pháp luật khi thực hiện Hợp đồng này và rằng Bên B có các kỹ năng, trình độ, nguồn lực và tất cả các chấp thuận cần thiết, bao gồm nhưng không giới hạn bởi các chấp thuận theo yêu cầu pháp luật để thực hiện các nghĩa vụ của Bên B theo Hợp đồng này."
    ),
    clause(
      "- Bên B bảo đảm rằng Bên A không phải chịu trách nhiệm đối với bất kỳ và tất cả các khiếu nại, trách nhiệm pháp lý (bao gồm tổn thất lợi nhuận, tổn thất kinh doanh, suy giảm lợi thế thương mại và các tổn thất tương tự), các chi phí, thủ tục tố tụng, tổn thất và phí tổn (bao gồm các phí và chi phí pháp lý hay chuyên môn khác) mà Bên A phải chịu từ hoặc liên quan đến: bất kỳ vi phạm thực tế hay tiềm tàng nào theo quy định của pháp luật Việt Nam và Hợp đồng này phát sinh từ việc Bên B ký kết và thực hiện Hợp đồng; bất kỳ trách nhiệm nào phát sinh từ việc Bên B vi phạm các bảo đảm hay nghĩa vụ quy định tại Hợp đồng này, hoặc từ hành động hoặc không hành động của Bên B (hoặc bên thứ ba do Bên B chỉ định)."
    ),

    // ── Điều 10 ────────────────────────────────────────────────────────────
    heading("ĐIỀU 10: CHỐNG HỐI LỘ VÀ THAM NHŨNG"),
    clause(
      "Liên quan đến Hợp đồng này và các hoạt động kinh doanh thông thường, Bên B sẽ bảo đảm rằng Bên B cũng như Các Bên Liên Kết của Bên B không tham gia vào bất kỳ hoạt động, hành động hoặc hành vi nào có thể dẫn đến việc vi phạm Luật Chống Tham Nhũng được áp dụng. Cụ thể, Bên B sẽ không, và sẽ đảm bảo Các Bên Liên Kết sẽ không chào mời, hoặc chi trả cho, hoặc xin hoặc nhận từ bất kỳ cá nhân (bao gồm cả công chức và nhân viên chính phủ) hoặc công ty nào, bất kỳ tài sản nào nhằm mục đích có được lợi thế trong hoạt động kinh doanh hoặc khiến cho người khác thực hiện quyền hạn của mình một cách sai trái."
    ),
    clause(
      "“Các Bên Liên Kết” có nghĩa là tất cả nhân viên, đại lý, bên tư vấn, đối tác, đại diện hoặc nhà thầu phụ của Bên B. Bên B sẽ thực hiện và duy trì các chính sách và thủ tục để đánh giá rủi ro, giám sát và ngăn ngừa sự vi phạm Luật Chống Tham Nhũng; các chính sách này sẽ được lập sẵn để Bên A kiểm tra bất kỳ lúc nào theo yêu cầu bằng văn bản. Ngay khi phát hiện được, Bên B sẽ thông báo cho Bên A bất kỳ vi phạm hoặc vi phạm khả nghi nào của người lao động hoặc Bên Liên Kết đối với Điều này."
    ),

    // ── Điều 11 ────────────────────────────────────────────────────────────
    heading("ĐIỀU 11: CHẤM DỨT HỢP ĐỒNG"),
    clause(
      "Mỗi Bên có quyền chấm dứt Hợp đồng này trong trường hợp xảy ra Sự Kiện Bất Khả Kháng quy định tại Điều 8."
    ),
    clause(
      "Bên A có quyền chấm dứt Hợp đồng này ngay lập tức nếu Bên B vi phạm bất kỳ điều khoản nào trong Hợp đồng này."
    ),
    clause(
      "Hợp đồng này được chấm dứt khi thời hạn của Hợp đồng kết thúc, trừ khi các bên có thỏa thuận bằng văn bản."
    ),
    clause(
      "Nếu có bất kỳ vi phạm nghiêm trọng hay cơ bản nào đối với Hợp đồng này do nhân viên của Bên B gây ra trong thời gian thi công thì Bên B phải khắc phục vi phạm đó ngay lập tức và sẽ hoàn toàn chịu mọi chi phí phát sinh (nếu có); Bên A có quyền trì hoãn thanh toán cho đến khi vi phạm được khắc phục."
    ),
    clause(
      "Trừ trường hợp có thỏa thuận khác trong Hợp đồng này, trường hợp một trong hai bên đơn phương tự ý chấm dứt hợp đồng, bên vi phạm phải bồi thường và chịu phạt vi phạm theo Điều 5 của hợp đồng này cho bên còn lại."
    ),

    // ── Điều 12 ────────────────────────────────────────────────────────────
    heading("ĐIỀU 12: GIẢI QUYẾT TRANH CHẤP"),
    clause(
      "Hai bên có trách nhiệm thông báo cho nhau về việc thực hiện hợp đồng. Nếu có khó khăn trong quá trình thực hiện hợp đồng thì phải thông báo bằng văn bản và cùng nhau thương lượng giải quyết bảo đảm quyền lợi cả hai bên."
    ),
    clause(
      "Việc giải thích, thực hiện và hiệu lực của Hợp đồng được điều chỉnh theo quy định của pháp luật Việt Nam."
    ),
    clause(
      "Bất kỳ tranh chấp, mâu thuẫn hoặc khiếu nại nào phát sinh từ hoặc liên quan đến Hợp đồng này, bao gồm bất kỳ vấn đề nào liên quan đến sự tồn tại, vi phạm, hiệu lực hoặc chấm dứt của Hợp đồng này, sẽ được giải quyết bởi cơ quan có thẩm quyền theo quy định của pháp luật. Phán quyết của cơ quan này là cơ sở để hai bên thực hiện. Bên thua kiện chịu hoàn toàn án phí."
    ),
    clause("Hợp đồng này có hiệu lực từ ngày ký."),
    clause(
      "Hợp đồng này được lập thành 02 bản gốc, mỗi bên giữ 01 bản có giá trị pháp lý như nhau."
    ),
    clause(
      "Sau khi hai bên hoàn thành nghĩa vụ của mình thì hợp đồng mặc nhiên được thanh lý."
    )
  );
