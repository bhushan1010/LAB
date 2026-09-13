import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

export default function ReportPreview({ data, className = '' }) {
  const safeData = data || {};
  const labConfig = safeData.labConfig || {};
  const patient = safeData.patient || {};
  const visit = safeData.visit || {};
  const department = safeData.department || 'DEPARTMENT OF BIOCHEMISTRY';
  const testResults = Array.isArray(safeData.testResults) ? safeData.testResults : [];
  let interpretation = safeData.interpretation || { enabled: false, increasedIn: [], decreasedIn: [] };
  if (typeof interpretation === 'string') {
    try {
      interpretation = JSON.parse(interpretation);
    } catch {
      interpretation = { enabled: false };
    }
  }
  const signatory = safeData.signatory || {};
  const barcode_value = safeData.barcode_value || '';
  const qr_token = safeData.qr_token || '';

  const [qrDataUrl, setQrDataUrl] = useState('');
  const barcodeCanvasRef = useRef(null);

  // Generate QR Code
  useEffect(() => {
    const payload = qr_token
      ? `${window.location.origin}/report/${qr_token}`
      : 'https://lab.domain/report/verify-sample';

    QRCode.toDataURL(payload, {
      width: 90,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [qr_token]);

  // Generate Barcode
  useEffect(() => {
    if (barcodeCanvasRef.current && barcode_value) {
      try {
        JsBarcode(barcodeCanvasRef.current, barcode_value, {
          format: 'CODE128',
          width: 1.2,
          height: 24,
          displayValue: false,
          margin: 0,
        });
      } catch (err) {
        console.warn('Barcode render error:', err);
      }
    }
  }, [barcode_value]);

  return (
    <div
      id="printable-report"
      className={`bg-white text-black font-sans relative shadow-2xl mx-auto print:shadow-none print:m-0 print:border-none print:w-[210mm] print:h-[295mm] print:max-h-[295mm] print:overflow-hidden ${className}`}
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '10mm 12mm',
        boxSizing: 'border-box',
        fontSize: '11px',
        lineHeight: '1.3',
      }}
    >
      {/* Red Side Ribbon (Vertical TEST REPORT badge) */}
      {labConfig.showSideBadge && (
        <div
          className="absolute right-0 top-16 bg-[#c4252b] text-white flex items-center justify-center font-bold tracking-widest uppercase text-xs"
          style={{
            width: '26px',
            height: '140px',
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          {labConfig.sideBadgeText || 'TEST REPORT'}
        </div>
      )}

      {/* TOP HEADER / LOGO */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-slate-300 mb-3">
        <div className="flex items-center gap-3">
          {labConfig.logoUrl ? (
            <img
              src={labConfig.logoUrl}
              alt="Lab Logo"
              className="h-16 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className="border-2 border-dashed border-gray-400 px-4 py-2 text-center text-xs text-gray-500 font-semibold rounded">
              [ LAB LOGO PLACEHOLDER ]
            </div>
          )}
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#c4252b] uppercase">
              {labConfig.name || 'SUNRISE'}
            </h1>
            <p className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
              {labConfig.subtitle || 'Diagnostic & Research Centre (Demo)'}
            </p>
          </div>
        </div>
      </div>

      {/* PATIENT & VISIT DEMOGRAPHICS (Two-column bordered grid) */}
      <div className="border border-black mb-3">
        <div className="grid grid-cols-2 text-[10.5px]">
          {/* Left Column */}
          <div className="p-2 border-r border-black space-y-0.5">
            <div className="flex">
              <span className="w-28 font-bold">Visit ID</span>
              <span>: {visit.visit_code || '—'}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-bold">UHID/MR No</span>
              <span>: {patient.uhid || '—'}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-bold">Patient Name</span>
              <span className="font-bold">
                : {patient.title || ''} {patient.full_name || '—'}
              </span>
            </div>
            <div className="flex">
              <span className="w-28 font-bold">Age/Gender</span>
              <span>
                : {patient.age_years !== undefined ? `${patient.age_years} Y` : '—'}{' '}
                {patient.age_months ? `${patient.age_months} M ` : ''}
                {patient.age_days ? `${patient.age_days} D ` : ''}/ {patient.gender || 'M'}
              </span>
            </div>
            <div className="flex">
              <span className="w-28 font-bold">Ref Doctor</span>
              <span>: {visit.ref_doctor || '—'}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-bold">Client Name</span>
              <span>: {visit.client_name || '—'}</span>
            </div>
          </div>

          {/* Right Column */}
          <div className="p-2 space-y-0.5">
            <div className="flex">
              <span className="w-28 font-bold">Collected</span>
              <span>: {visit.collected_at || '—'}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-bold">Reported</span>
              <span>: {visit.reported_at || '—'}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-bold">Status</span>
              <span className="font-semibold">: {visit.status || 'Final Report'}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-bold">Client Code</span>
              <span>: {visit.client_code || '—'}</span>
            </div>
            <div className="flex items-center">
              <span className="w-28 font-bold">Barcode No</span>
              <div className="flex items-center gap-1">
                <span>: {barcode_value || '—'}</span>
                {barcode_value && <canvas ref={barcodeCanvasRef} className="h-4" />}
              </div>
            </div>
            <div className="flex">
              <span className="w-28 font-bold">RCH ID/MCTSID</span>
              <span>: {visit.rch_id_mcts_id || ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* DEPARTMENT TITLE */}
      <div className="text-center font-bold text-xs tracking-wider border-t border-b border-black py-0.5 mb-2 uppercase bg-gray-50">
        {department || 'DEPARTMENT OF BIOCHEMISTRY'}
      </div>

      {/* TABULAR TEST RESULTS */}
      <div className="mb-4">
        <table className="w-full text-[10.5px] border-collapse">
          <thead>
            <tr className="border-b border-black text-left font-bold">
              <th className="py-1 w-[35%]">Test Name</th>
              <th className="py-1 w-[15%] text-center">Result</th>
              <th className="py-1 w-[15%] text-center">Unit</th>
              <th className="py-1 w-[20%] text-center">Bio. Ref. Range</th>
              <th className="py-1 w-[15%]">Method</th>
            </tr>
          </thead>
          <tbody>
            {/* Sample Type Subheader */}
            {visit.sample_type && (
              <tr>
                <td colSpan="5" className="pt-2 pb-1 font-semibold text-xs border-b border-gray-200">
                  Sample Type : {visit.sample_type}
                </td>
              </tr>
            )}

            {testResults.map((test, index) => {
              const isAbnormal = test.flag === 'HIGH' || test.flag === 'LOW' || test.flag === 'CRITICAL';
              return (
                <tr key={test.id || index} className="border-b border-gray-200 hover:bg-slate-50">
                  <td className="py-1.5 font-medium">{test.test_name || '—'}</td>
                  <td className={`py-1.5 text-center font-bold ${isAbnormal ? 'text-red-600' : ''}`}>
                    {test.result_value || '—'}
                    {isAbnormal && <span className="ml-1 text-[9px]">({test.flag})</span>}
                  </td>
                  <td className="py-1.5 text-center">{test.unit || '—'}</td>
                  <td className="py-1.5 text-center">{test.reference_range || '—'}</td>
                  <td className="py-1.5 text-gray-700">{test.method || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* INTERPRETATION BLOCK */}
      {interpretation?.enabled && (
        <div className="border border-black p-2.5 mb-4 text-[10px] space-y-2">
          <div className="font-bold underline uppercase tracking-wide">INTERPRETATION:</div>

          {interpretation.increasedIn && interpretation.increasedIn.length > 0 && (
            <div>
              <div className="font-semibold text-gray-900">Increased In</div>
              <ul className="list-disc list-inside pl-2 space-y-0.5 text-gray-800">
                {interpretation.increasedIn.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {interpretation.decreasedIn && interpretation.decreasedIn.length > 0 && (
            <div>
              <div className="font-semibold text-gray-900">Decreased In</div>
              <ul className="list-disc list-inside pl-2 space-y-0.5 text-gray-800">
                {interpretation.decreasedIn.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {interpretation.disclaimer && (
            <p className="text-gray-700 italic pt-1 border-t border-gray-200">
              {interpretation.disclaimer}
            </p>
          )}
        </div>
      )}

      {/* DELIMITER */}
      <div className="text-center font-bold text-xs tracking-widest my-3">
        *** End Of Report ***
      </div>

      {/* PHYSICAL SIGNATURE PLACEHOLDER (Doctor Sign-off Area) */}
      <div className="flex justify-end mt-4 mb-6">
        <div className="w-56 text-center border-t border-black pt-1">
          <div className="h-10 flex items-center justify-center text-gray-400 italic text-[9px] border border-dashed border-gray-300 rounded mb-1">
            (Physical Doctor Signature & Stamp Area)
          </div>
          <div className="font-bold text-xs">{signatory.name || 'Dr. SAMPLE SIGNATORY'}</div>
          <div className="text-[10px] text-gray-700">{signatory.qualifications || 'MBBS, MD [Path]'}</div>
          <div className="text-[10px] text-gray-700">{signatory.reg_no || 'Reg. No. - 00000'}</div>
        </div>
      </div>

      {/* FOOTER BLOCK (QR Code, Lab Address & Pagination) */}
      <div className="absolute bottom-6 left-12 right-12 pt-2 border-t border-gray-300 flex items-end justify-between text-[9px] text-gray-600">
        {/* QR Code & Scan verification link */}
        <div className="flex items-center gap-2">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Report QR Verification" className="w-14 h-14" />
          ) : (
            <div className="w-14 h-14 border border-gray-400 flex items-center justify-center text-[8px] text-center">
              QR Code
            </div>
          )}
          <div className="text-[8px] leading-tight text-gray-500">
            <div>Scan QR for Online</div>
            <div>Authentic Copy</div>
          </div>
        </div>

        {/* Center Address */}
        <div className="text-center flex-1 px-4 leading-normal">
          <div>{labConfig.address}</div>
          <div>
            {labConfig.mobile && `Mobile: ${labConfig.mobile}`}
            {labConfig.landline && ` Landline: ${labConfig.landline}`}
          </div>
          <div className="text-[8px] text-gray-400 mt-0.5">
            Note: This report is subject to clinical correlation. Partial reproduction not permitted.
          </div>
        </div>

        {/* Right Pagination */}
        <div className="font-semibold text-gray-700 text-right">
          Page 1 of 1
        </div>
      </div>
    </div>
  );
}
