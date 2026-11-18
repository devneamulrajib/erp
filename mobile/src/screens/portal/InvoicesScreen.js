// Port of PortalInvoices.jsx
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Download } from 'lucide-react-native';
import { getPortalBills, downloadPortalBillPdf } from '../../portal/api/portalBills';
import { getPortalSupplierInvoices, downloadInvoice } from '../../portal/api/portalPurchaseOrders';
import { useAuth } from '../../context/AuthContext';
import { Badge, Button, Card, Empty, ErrorBox, List, Loading, PageHeader, Row, Sub, T, useAsync } from '../../components/ui';
import { money, fmtDate, errMsg } from '../../utils/format';
import { colors } from '../../theme';

export default function InvoicesScreen() {
  const { session } = useAuth();
  const isSupplier = ['supplier', 'vendor'].includes(session?.user?.role);
  const { data, loading, error, refreshing, refresh, reload } = useAsync(isSupplier ? getPortalSupplierInvoices : getPortalBills, [isSupplier]);
  const [downloadingId, setDownloadingId] = useState(null);

  async function handleDownload(bill) {
    setDownloadingId(bill.id);
    try {
      if (isSupplier) await downloadInvoice(bill.purchaseOrderId);
      else await downloadPortalBillPdf(bill.id, `Invoice-${bill.code}.pdf`);
    } catch (err) {
      Alert.alert('Download failed', errMsg(err, 'Failed to download invoice'));
    } finally {
      setDownloadingId(null);
    }
  }

  if (loading) return <Loading />;
  return (
    <List
      data={Array.isArray(data) ? data : []}
      refreshing={refreshing}
      onRefresh={refresh}
      header={
        <View>
          <PageHeader title="Invoices" subtitle={isSupplier ? 'Invoices generated from your delivered orders' : 'Your billing history and payment status'} />
          <ErrorBox message={error} onRetry={reload} />
        </View>
      }
      empty={<Empty text="No invoices yet" />}
      renderItem={({ item: b }) => (
        <Card>
          <Row between>
            <View style={{ flex: 1 }}>
              <T bold>{b.code}</T>
              <Sub>{fmtDate(b.date)}{b.purchaseOrderCode ? ` · PO ${b.purchaseOrderCode}` : ''}</Sub>
            </View>
            <Badge status={b.status} />
          </Row>
          <Row between style={{ marginTop: 12 }}>
            <View>
              <Sub>Total</Sub>
              <T bold>{money(b.grandTotal)}</T>
            </View>
            <View>
              <Sub>Due</Sub>
              <T bold style={{ color: Number(b.due) > 0 ? colors.red : colors.emerald }}>{money(b.due)}</T>
            </View>
            <Button small variant="outline" title="PDF" icon={<Download size={14} color={colors.text2} />} loading={downloadingId === b.id} onPress={() => handleDownload(b)} />
          </Row>
        </Card>
      )}
    />
  );
}
