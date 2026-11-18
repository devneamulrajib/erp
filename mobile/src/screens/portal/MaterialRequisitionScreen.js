// Port of PortalMaterialRequisitionView.jsx incl. the quotation form.
import { useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { Send, Pencil, ExternalLink } from 'lucide-react-native';
import { getPortalMaterialRequisition, submitQuotation } from '../../portal/api/portalMaterialRequisitions';
import { Badge, Button, Card, DateField, ErrorBox, H1, H2, Input, KV, Loading, Notice, Row, Screen, Sub, T, useAsync } from '../../components/ui';
import { money, fmtDate, errMsg } from '../../utils/format';
import { colors, radius } from '../../theme';
import { MR_LABELS } from './MaterialRequisitionsScreen';

function QuotationForm({ requisition, initialQuotation, onSubmitted, onCancel }) {
  const prior = Object.fromEntries((initialQuotation?.items || []).map((q) => [q.materialRequisitionItemId, q]));
  const items = requisition.items || [];
  const [available, setAvailable] = useState(() => Object.fromEntries(items.map((it) => [it.id, prior[it.id] ? prior[it.id].available !== false : true])));
  const [offeredQty, setOfferedQty] = useState(() => Object.fromEntries(items.map((it) => [it.id, String(prior[it.id] && prior[it.id].available !== false ? prior[it.id].offeredQty : it.demandQty ?? '')])));
  const [rates, setRates] = useState(() => Object.fromEntries(items.map((it) => [it.id, prior[it.id] && prior[it.id].available !== false ? String(Number(prior[it.id].quotedRate) || '') : ''])));
  const [validUntil, setValidUntil] = useState(initialQuotation?.validUntil || '');
  const [notes, setNotes] = useState(initialQuotation?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const subtotal = items.reduce((sum, it) => (available[it.id] ? sum + (Number(rates[it.id]) || 0) * (Number(offeredQty[it.id]) || 0) : sum), 0);

  async function handleSubmit() {
    setError('');
    if (!Object.values(available).some(Boolean)) { setError('Mark at least one item as available before submitting'); return; }
    const payloadItems = items.map((it) => ({
      materialRequisitionItemId: it.id,
      available: !!available[it.id],
      offeredQty: available[it.id] ? Number(offeredQty[it.id]) || 0 : 0,
      quotedRate: available[it.id] ? Number(rates[it.id]) || 0 : 0,
    }));
    if (payloadItems.some((it) => it.available && (it.offeredQty <= 0 || it.quotedRate <= 0))) {
      setError('Enter a valid quantity and rate for every item marked available');
      return;
    }
    setSubmitting(true);
    try {
      const created = await submitQuotation(requisition.id, { validUntil, notes, items: payloadItems });
      onSubmitted(created);
    } catch (err) {
      setError(errMsg(err, 'Failed to submit quotation'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card style={{ marginBottom: 12 }}>
      <H2>{initialQuotation ? 'Update your quotation' : 'Your quotation'}</H2>
      <Sub style={{ marginBottom: 12 }}>Toggle items you can supply, then enter quantity and rate.</Sub>
      {items.map((it) => (
        <View key={it.id} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: 10, opacity: available[it.id] ? 1 : 0.6 }}>
          <Row between>
            <View style={{ flex: 1 }}>
              <T bold>{it.itemName}</T>
              <Sub>Req: {it.demandQty} {it.unit || ''}{it.details ? ` · ${it.details}` : ''}</Sub>
            </View>
            <Switch value={!!available[it.id]} onValueChange={(v) => setAvailable((a) => ({ ...a, [it.id]: v }))} />
          </Row>
          {available[it.id] && (
            <Row style={{ marginTop: 10 }} gap={10}>
              <View style={{ flex: 1 }}>
                <Sub>Qty</Sub>
                <TextInput style={inputSt} keyboardType="decimal-pad" value={offeredQty[it.id]} onChangeText={(v) => setOfferedQty((q) => ({ ...q, [it.id]: v }))} />
              </View>
              <View style={{ flex: 1 }}>
                <Sub>Rate (৳)</Sub>
                <TextInput style={inputSt} keyboardType="decimal-pad" value={rates[it.id]} onChangeText={(v) => setRates((r) => ({ ...r, [it.id]: v }))} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Sub>Amount</Sub>
                <T bold>{money((Number(rates[it.id]) || 0) * (Number(offeredQty[it.id]) || 0))}</T>
              </View>
            </Row>
          )}
        </View>
      ))}
      <DateField label="Valid until (optional)" value={validUntil} onChange={setValidUntil} minimumDate={new Date()} />
      <Input label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      <Row between style={{ marginBottom: 12 }}><T bold>Subtotal</T><T bold style={{ fontSize: 18 }}>{money(subtotal)}</T></Row>
      <ErrorBox message={error} />
      <Button title={initialQuotation ? 'Update Quotation' : 'Submit Quotation'} icon={<Send size={15} color="#fff" />} loading={submitting} onPress={handleSubmit} />
      {onCancel ? <Button title="Cancel" variant="ghost" onPress={onCancel} style={{ marginTop: 6 }} /> : null}
    </Card>
  );
}
const inputSt = { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: colors.text, textAlign: 'right', marginTop: 4 };

export default function MaterialRequisitionScreen({ route, navigation }) {
  const { id } = route.params;
  const { data: req, loading, error, refreshing, refresh, reload } = useAsync(() => getPortalMaterialRequisition(id), [id]);
  const [editing, setEditing] = useState(false);

  if (loading) return <Loading />;
  if (!req) return <Screen><ErrorBox message={error || 'Requisition not found'} onRetry={reload} /></Screen>;

  const myQuotation = req.quotations?.[0];
  const needsCorrection = req.status === 'Open' && myQuotation?.status === 'NeedsCorrection';
  const canRespond = req.status === 'Open' && (!myQuotation || needsCorrection);
  const canEdit = req.status === 'Open' && myQuotation?.status === 'Submitted';
  const showForm = canRespond || (canEdit && editing);
  const headerStatus = needsCorrection ? 'NeedsCorrection' : req.status;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Card style={{ marginBottom: 12 }}>
        <Row between><Sub>{req.code}</Sub><Badge status={headerStatus} label={MR_LABELS[headerStatus] || headerStatus} /></Row>
        <H1 style={{ fontSize: 19, marginTop: 4 }}>{req.titleOfWork || 'Material Requisition'}</H1>
        <View style={{ marginTop: 8 }}>
          <KV label="Date" value={fmtDate(req.date)} />
          <KV label="Demand date" value={fmtDate(req.demandDate)} />
          <KV label="Project" value={req.project?.name || '—'} />
          <KV label="Site" value={req.site?.name || '—'} last={!req.reference} />
          {req.reference ? <KV label="Reference" value={req.reference} last /> : null}
        </View>
      </Card>

      {needsCorrection && <Notice tone="warn" message={`Correction requested: ${myQuotation.correctionNote || 'Please review and resubmit your quotation.'}`} />}

      {!showForm && (
        <Card style={{ marginBottom: 12 }}>
          <H2>Items</H2>
          {(req.items || []).length === 0 ? <Sub>No items</Sub> : req.items.map((it, i) => (
            <Row key={it.id} between style={{ paddingVertical: 10, borderBottomWidth: i === req.items.length - 1 ? 0 : 1, borderBottomColor: colors.borderLight }}>
              <View style={{ flex: 1 }}><T>{it.itemName}</T>{it.details ? <Sub>{it.details}</Sub> : null}</View>
              <T bold>{it.demandQty} {it.unit || ''}</T>
            </Row>
          ))}
        </Card>
      )}

      {showForm && (
        <QuotationForm requisition={req} initialQuotation={myQuotation || null} onSubmitted={() => { setEditing(false); reload(); }} onCancel={editing ? () => setEditing(false) : undefined} />
      )}

      {!showForm && myQuotation && myQuotation.status !== 'NeedsCorrection' && (
        <Card style={{ marginBottom: 12 }}>
          <Row between>
            <H2>Your quotation</H2>
            <Row gap={8}>
              <Badge status={myQuotation.status} label={MR_LABELS[myQuotation.status] || myQuotation.status} />
              {canEdit && <Pressable onPress={() => setEditing(true)} hitSlop={8}><Pencil size={16} color={colors.text2} /></Pressable>}
            </Row>
          </Row>
          {(myQuotation.items || []).map((it, i) => {
            const isAvailable = it.available !== false;
            return (
              <Row key={it.id || i} between style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                <View style={{ flex: 1 }}>
                  <T style={!isAvailable ? { textDecorationLine: 'line-through', color: colors.faint } : null}>{it.itemName}</T>
                  <Sub>{isAvailable ? `${it.offeredQty} × ${money(it.quotedRate)}` : 'Not available'}</Sub>
                </View>
                <T bold>{isAvailable ? money(it.quotedAmount ?? (Number(it.offeredQty) || 0) * (Number(it.quotedRate) || 0)) : '—'}</T>
              </Row>
            );
          })}
          <KV label="Subtotal" value={money(myQuotation.subtotal)} strong />
          {myQuotation.validUntil ? <KV label="Valid until" value={fmtDate(myQuotation.validUntil)} /> : null}
          {myQuotation.notes ? <KV label="Notes" value={myQuotation.notes} last /> : null}
        </Card>
      )}

      {req.convertedToPurchaseOrder && (
        <Card onPress={() => navigation.navigate('PurchaseOrder', { id: req.convertedToPurchaseOrder.id })}>
          <Row between>
            <View><Sub>Converted to purchase order</Sub><T bold>{req.convertedToPurchaseOrder.code}</T></View>
            <ExternalLink size={16} color={colors.text2} />
          </Row>
        </Card>
      )}
    </Screen>
  );
}
