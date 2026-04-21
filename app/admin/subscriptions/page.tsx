"use client";

import { useState, useEffect } from "react";

export default function AdminSubscriptions() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    const res = await fetch("/api/admin/pending-subscriptions");
    const data = await res.json();
    setRequests(data);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const activateSubscription = async (userId: number, featureName: string) => {
    setLoading(true);
    const res = await fetch("/api/admin/activate-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, featureName }),
    });
    if (res.ok) {
      alert("تم تفعيل الاشتراك بنجاح");
      fetchRequests();
    } else {
      alert("فشل التفعيل");
    }
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">طلبات الاشتراك المعلقة</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">المستخدم</th>
            <th className="p-2">الميزة</th>
            <th className="p-2">الخطة</th>
            <th className="p-2">الإجراء</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id} className="border-t">
              <td className="p-2">{req.email}</td>
              <td className="p-2">{req.feature_name}</td>
              <td className="p-2">{req.plan_type}</td>
              <td className="p-2">
                <button
                  onClick={() => activateSubscription(req.user_id, req.feature_name)}
                  disabled={loading}
                  className="bg-green-800 text-white px-3 py-1 rounded"
                >
                  تفعيل
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}