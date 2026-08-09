import React, { useState } from 'react';
import { Users, Award, BookOpen, CheckCircle2, ArrowRight } from 'lucide-react';
import { ROLE_COURSES } from '../api/trainingApi';
import { UserRole } from '../types/trainingTypes';

export function RoleTrainingPaths() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('owner');

  const roles: { role: UserRole; title: string; description: string }[] = [
    { role: 'owner', title: 'Enterprise Owner', description: 'Complete system configuration, connections, budgets, security, and go-live.' },
    { role: 'manager', title: 'Boutique Store Manager', description: 'Daily operations, appointments, inventory transfers, and employee approvals.' },
    { role: 'consultant', title: 'Bridal Stylist / Consultant', description: 'Bride consultation records, dress fitting appointments, and customer sales.' },
    { role: 'inventory', title: 'Inventory Specialist', description: 'Barcode scanning, receiving purchase orders, physical counts, and transfers.' },
    { role: 'marketing', title: 'Growth & Marketing Lead', description: 'Ad campaigns, budget controls, CallRail tracking, and AI Copilot.' },
    { role: 'finance', title: 'Finance & Accounting', description: 'Invoices, payments, refunds, tax boundaries, and gross profit reports.' },
    { role: 'alterations', title: 'Alterations & Fitting Specialist', description: 'Bride fitting schedules, measurements, alterations tracking, and pickup.' },
  ];

  const filteredCourses = ROLE_COURSES.filter((c) => c.audienceRoles.includes(selectedRole));

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-sky-600" />
          <h2 className="text-xl font-black text-stone-900">Role-Specific Employee Academy</h2>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Customized training tracks tailored for every job role at The Boutique, Proper &amp; Co., and I Do Bridal Couture.
        </p>
      </div>

      {/* Role Selection Pills */}
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <button
            key={r.role}
            onClick={() => setSelectedRole(r.role)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              selectedRole === r.role
                ? 'bg-stone-900 text-white shadow-md'
                : 'bg-white text-stone-700 border border-stone-200 hover:border-stone-300'
            }`}
          >
            {r.title}
          </button>
        ))}
      </div>

      {/* Course List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCourses.map((course) => (
          <div key={course.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                  {course.code}
                </span>
                <h3 className="font-bold text-base text-stone-900 mt-1">{course.title}</h3>
              </div>
              <span className="text-xs font-bold text-stone-500">~{course.estimatedMinutes} mins</span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">{course.description}</p>

            <button className="w-full rounded-xl bg-stone-900 text-white px-4 py-2.5 text-xs font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2">
              Launch Role Curriculum <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
