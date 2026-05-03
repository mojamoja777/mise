// lib/pdf/invoice.tsx
// 請求書PDFコンポーネント（@react-pdf/renderer）
// サーバーサイドで請求書データから PDF Buffer を生成する

import path from "path";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

// Noto Sans JP（日本語フォント）を登録
// プロジェクトルートからの絶対パスでOTFを読み込む
const fontDir = path.join(process.cwd(), "lib", "pdf", "fonts");

Font.register({
  family: "NotoSansJP",
  fonts: [
    { src: path.join(fontDir, "NotoSansJP-Regular.otf"), fontWeight: "normal" },
    { src: path.join(fontDir, "NotoSansJP-Bold.otf"), fontWeight: "bold" },
  ],
});

// 日本語テキストの自動折り返し時のハイフネーションを無効化
Font.registerHyphenationCallback((word) => [word]);

export type InvoicePdfData = {
  id: string;
  periodStart: string;
  periodEnd: string;
  /** 税抜小計 */
  subtotalAmount: number;
  /** 消費税合計（税率別合算） */
  taxAmount: number;
  /** 税込総額（請求金額） */
  totalAmount: number;
  /** 税率別の内訳（PDF の税区分表示用） */
  taxBreakdown: Array<{ rate: number; subtotal: number; tax: number }>;
  note: string | null;
  issuedAt: string;
  updatedAt: string;
  items: Array<{
    productName: string;
    producer: string | null;
    region: string | null;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
  buyer: {
    companyName: string;
    customerCode: string | null;
    postalCode: string | null;
    address: string | null;
    phone: string | null;
  };
  tenant: {
    companyName: string;
    displayName: string;
    postalCode: string | null;
    address: string | null;
    phone: string | null;
    fax: string | null;
    invoiceNumber: string | null;
    bankInfo: string | null;
    representative: string | null;
  };
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: 10,
    padding: 40,
    color: "#1a1a1a",
  },
  header: {
    textAlign: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 4,
  },
  issuedDate: {
    fontSize: 9,
    color: "#666",
    marginTop: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  buyerBlock: {
    flex: 1,
  },
  buyerName: {
    fontSize: 14,
    fontWeight: "bold",
    borderBottomWidth: 1.5,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 3,
    marginBottom: 6,
  },
  buyerMeta: {
    fontSize: 9,
    color: "#666",
    marginTop: 2,
  },
  issuerBlock: {
    alignItems: "flex-end",
    maxWidth: "45%",
  },
  issuerName: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 3,
  },
  issuerMeta: {
    fontSize: 8,
    color: "#555",
    textAlign: "right",
    lineHeight: 1.4,
  },
  bankBlock: {
    marginTop: 14,
    padding: 10,
    borderWidth: 0.5,
    borderColor: "#d1d5db",
    borderRadius: 3,
  },
  bankLabel: {
    fontSize: 9,
    color: "#6b7280",
    fontWeight: "bold",
    marginBottom: 4,
  },
  bankText: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  totalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "bold",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
  },
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: "#1a1a1a",
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 6,
  },
  tableFooter: {
    flexDirection: "row",
    borderTopWidth: 1.5,
    borderTopColor: "#1a1a1a",
    paddingVertical: 8,
  },
  colNo: { width: "6%" },
  colName: { width: "34%" },
  colMeta: { width: "28%" },
  colPrice: { width: "12%", textAlign: "right" },
  colQty: { width: "8%", textAlign: "right" },
  colSubtotal: { width: "12%", textAlign: "right" },
  th: {
    fontSize: 9,
    fontWeight: "bold",
  },
  td: {
    fontSize: 10,
  },
  tdMuted: {
    fontSize: 9,
    color: "#6b7280",
  },
  note: {
    marginTop: 16,
    padding: 10,
    borderWidth: 0.5,
    borderColor: "#d1d5db",
    borderRadius: 3,
  },
  noteLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "bold",
  },
  noteText: {
    fontSize: 10,
  },
  footer: {
    marginTop: 24,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#d1d5db",
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
  },
  revisedBadge: {
    marginTop: 6,
    fontSize: 8,
    color: "#b91c1c",
  },
});

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.getFullYear()}年${s.getMonth() + 1}月${s.getDate()}日 〜 ${e.getFullYear()}年${e.getMonth() + 1}月${e.getDate()}日`;
}

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const totalQty = data.items.reduce((sum, i) => sum + i.quantity, 0);
  // issued_at と updated_at が異なる場合は「修正あり」と表示
  const wasRevised =
    new Date(data.updatedAt).getTime() - new Date(data.issuedAt).getTime() >
    60_000; // 1分以上のズレを修正とみなす

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>請 求 書</Text>
          <Text style={styles.issuedDate}>発行日：{formatDate(data.issuedAt)}</Text>
          {wasRevised && (
            <Text style={styles.revisedBadge}>
              ※ 修正日：{formatDate(data.updatedAt)}
            </Text>
          )}
        </View>

        {/* 宛先・発行元 */}
        <View style={styles.infoRow}>
          <View style={styles.buyerBlock}>
            {data.buyer.customerCode && (
              <Text style={styles.buyerMeta}>
                お客様コード：{data.buyer.customerCode}
              </Text>
            )}
            <Text style={styles.buyerName}>
              {data.buyer.companyName}　御中
            </Text>
            {(data.buyer.postalCode || data.buyer.address) && (
              <Text style={styles.buyerMeta}>
                {[
                  data.buyer.postalCode && `〒${data.buyer.postalCode}`,
                  data.buyer.address,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </Text>
            )}
            {data.buyer.phone && (
              <Text style={styles.buyerMeta}>TEL: {data.buyer.phone}</Text>
            )}
            <Text style={[styles.buyerMeta, { marginTop: 6 }]}>
              請求番号：#{data.id.slice(0, 8).toUpperCase()}
            </Text>
            <Text style={styles.buyerMeta}>
              対象期間：{formatPeriod(data.periodStart, data.periodEnd)}
            </Text>
          </View>
          <View style={styles.issuerBlock}>
            <Text style={styles.issuerName}>
              {data.tenant.displayName || data.tenant.companyName}
            </Text>
            {data.tenant.companyName &&
              data.tenant.companyName !== data.tenant.displayName && (
                <Text style={styles.issuerMeta}>{data.tenant.companyName}</Text>
              )}
            {(data.tenant.postalCode || data.tenant.address) && (
              <Text style={styles.issuerMeta}>
                {[
                  data.tenant.postalCode && `〒${data.tenant.postalCode}`,
                  data.tenant.address,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </Text>
            )}
            {data.tenant.phone && (
              <Text style={styles.issuerMeta}>TEL: {data.tenant.phone}</Text>
            )}
            {data.tenant.fax && (
              <Text style={styles.issuerMeta}>FAX: {data.tenant.fax}</Text>
            )}
            {data.tenant.invoiceNumber && (
              <Text style={styles.issuerMeta}>
                登録番号: {data.tenant.invoiceNumber}
              </Text>
            )}
            {data.tenant.representative && (
              <Text style={styles.issuerMeta}>
                代表者: {data.tenant.representative}
              </Text>
            )}
          </View>
        </View>

        {/* 合計金額（税込） */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>ご請求金額（税込）</Text>
          <Text style={styles.totalAmount}>{formatYen(data.totalAmount)}</Text>
        </View>

        {/* 明細 */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colNo, styles.th]}>No.</Text>
            <Text style={[styles.colName, styles.th]}>商品名</Text>
            <Text style={[styles.colMeta, styles.th]}>生産者 / 産地</Text>
            <Text style={[styles.colPrice, styles.th]}>単価</Text>
            <Text style={[styles.colQty, styles.th]}>数量</Text>
            <Text style={[styles.colSubtotal, styles.th]}>小計</Text>
          </View>
          {data.items.map((item, index) => {
            const subtotal = item.unitPrice * item.quantity;
            const meta = [item.producer, item.region].filter(Boolean).join(" / ");
            return (
              <View
                key={`${item.productName}-${index}`}
                style={styles.tableRow}
                wrap={false}
              >
                <Text style={[styles.colNo, styles.tdMuted]}>{index + 1}</Text>
                <Text style={[styles.colName, styles.td]}>{item.productName}</Text>
                <Text style={[styles.colMeta, styles.tdMuted]}>{meta || "—"}</Text>
                <Text style={[styles.colPrice, styles.td]}>
                  {formatYen(item.unitPrice)}
                </Text>
                <Text style={[styles.colQty, styles.td]}>{item.quantity}</Text>
                <Text style={[styles.colSubtotal, styles.td]}>
                  {formatYen(subtotal)}
                </Text>
              </View>
            );
          })}
          <View style={styles.tableFooter}>
            <Text
              style={[
                { width: "76%", textAlign: "right" },
                styles.th,
                { fontSize: 10 },
              ]}
            >
              税抜小計（{totalQty}本）
            </Text>
            <Text style={[styles.colQty]} />
            <Text
              style={[styles.colSubtotal, styles.th, { fontSize: 10 }]}
            >
              {formatYen(data.subtotalAmount)}
            </Text>
          </View>
          {data.taxBreakdown.map((b) => (
            <View key={b.rate} style={styles.tableFooter}>
              <Text
                style={[
                  { width: "76%", textAlign: "right" },
                  styles.th,
                  { fontSize: 9, fontWeight: "normal", color: "#555" },
                ]}
              >
                消費税（{Math.round(b.rate * 100)}%対象 {formatYen(b.subtotal)}）
              </Text>
              <Text style={[styles.colQty]} />
              <Text
                style={[styles.colSubtotal, styles.td, { fontSize: 10 }]}
              >
                {formatYen(b.tax)}
              </Text>
            </View>
          ))}
          <View style={styles.tableFooter}>
            <Text
              style={[
                { width: "76%", textAlign: "right" },
                styles.th,
                { fontSize: 11 },
              ]}
            >
              税込合計
            </Text>
            <Text style={[styles.colQty]} />
            <Text
              style={[styles.colSubtotal, styles.th, { fontSize: 12 }]}
            >
              {formatYen(data.totalAmount)}
            </Text>
          </View>
        </View>

        {/* 振込先 */}
        {data.tenant.bankInfo && (
          <View style={styles.bankBlock}>
            <Text style={styles.bankLabel}>お振込先</Text>
            <Text style={styles.bankText}>{data.tenant.bankInfo}</Text>
          </View>
        )}

        {/* 備考 */}
        {data.note && (
          <View style={styles.note}>
            <Text style={styles.noteLabel}>備考</Text>
            <Text style={styles.noteText}>{data.note}</Text>
          </View>
        )}

        {/* フッター */}
        <Text style={styles.footer}>
          お支払いは月末までにお願いいたします。ご不明点は発行元までご連絡ください。
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />);
}

// ファイル名生成（請求書_YYYY-MM_店舗名.pdf）
export function invoicePdfFileName(data: InvoicePdfData): string {
  const d = new Date(data.periodStart);
  const yyyyMm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const safeName = data.buyer.companyName.replace(/[\\/:*?"<>|]/g, "_");
  return `請求書_${yyyyMm}_${safeName}.pdf`;
}
