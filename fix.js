const fs = require("fs");
const content = `import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import Overview from "./Overview";
import RepairQueue from "./RepairQueue";
import Deployments from "./Deployments";

export default function DeliveryCenter() {
  const location = useLocation();
  const tabs = [
    { name: "Overview", path: "/platform/delivery" },
    { name: "Repair Queue", path: "/platform/delivery/queue" },
    { name: "Deployments", path: "/platform/delivery/deployments" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif text-stone-900 tracking-tight">Delivery & Recovery</h1>
        <p className="text-stone-500 mt-1">Self-healing CI/CD pipeline and release automation.</p>
      </div>

      <div className="flex space-x-1 border-b border-stone-200">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={\`px-4 py-2 text-sm font-medium border-b-2 transition-colors \${isActive ? "border-brand-primary text-stone-900" : "border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300"}\`}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>

      <div className="pt-4">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/queue" element={<RepairQueue />} />
          <Route path="/deployments" element={<Deployments />} />
          <Route path="*" element={<Navigate to="/platform/delivery" replace />} />
        </Routes>
      </div>
    </div>
  );
}
`;
fs.writeFileSync("apps/marketing/src/pages/PlatformAdmin/Delivery/DeliveryCenter.tsx", content, "utf8");

