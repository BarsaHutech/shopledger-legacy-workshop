var assert = require('node:assert/strict');
var test = require('node:test');
var db = require('../data/db.json');
var invoice = require('../lib/invoice');
var reports = require('../lib/reports');

function order(id) {
  return db.orders.find(function (entry) {
    return entry.id === id;
  });
}

test('SAVE10 invoice for order 1002 matches checkout totals', function () {
  var figures = invoice.computeInvoiceFigures(order(1002));

  assert.equal(figures.discount, 102);
  assert.equal(figures.tax, 45.9);
  assert.equal(figures.total, 963.9);
});

test('SAVE10 invoice for order 1004 applies its ₹150 discount cap', function () {
  var figures = invoice.computeInvoiceFigures(order(1004));

  assert.equal(figures.discount, 150);
  assert.equal(figures.tax, 104.5);
  assert.equal(figures.total, 2194.5);
});

test('non-coupon invoices use the HSN GST slabs for orders 1001 and 1007', function () {
  var teaAndDal = invoice.computeInvoiceFigures(order(1001));
  var gheeAndOil = invoice.computeInvoiceFigures(order(1007));

  assert.deepEqual(teaAndDal.rows.map(function (row) { return row.gstPercent; }), [18, 5]);
  assert.equal(teaAndDal.tax, 66.9);
  assert.equal(teaAndDal.total, 676.9);
  assert.deepEqual(gheeAndOil.rows.map(function (row) { return row.gstPercent; }), [12, 5]);
  assert.equal(gheeAndOil.tax, 127);
  assert.equal(gheeAndOil.total, 1407);
});

test('invoice figures reconcile with the stored checkout totals for all orders', function () {
  var result = reports.getGstReconciliation(db);

  assert.equal(result.totalChecked, 8);
  assert.equal(result.mismatchCount, 0);
});

test('the all-18-percent invoice for order 1008 remains unchanged', function () {
  var figures = invoice.computeInvoiceFigures(order(1008));

  assert.equal(figures.tax, 90);
  assert.equal(figures.total, 590);
});
