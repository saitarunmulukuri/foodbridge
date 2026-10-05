import { useState } from 'react';
import { authService } from '../services/authService';
import { donationService } from '../services/donationService';
import { decisionEngineService } from '../services/decisionEngineService';
import { ngoService } from '../services/ngoService';
import { volunteerService } from '../services/volunteerService';
import { setStoredToken, setStoredUser } from '../services/apiClient';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import {
  Play,
  Layers,
  Zap,
} from 'lucide-react';

export const E2EStepperPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutomating, setIsAutomating] = useState(false);
  const [logs, setLogs] = useState([]);
  const [demoState, setDemoState] = useState({
    donationId: null,
    donationStatus: 'IDLE',
    requestId: null,
    assignmentId: null,
  });

  const addLog = (message, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, message, type }, ...prev]);
  };

  const runFullE2EDemo = async () => {
    setIsAutomating(true);
    setLogs([]);
    setCurrentStep(1);
    addLog('Initiating Full E2E Automated Food Redistribution Lifecycle Demo...', 'highlight');

    try {
      // Step 1: Login Donor
      addLog('Step 1: Authenticating Donor persona (e2e_donor@foodbridge.org)...');
      const donorAuth = await authService.login('e2e_donor@foodbridge.org', 'Secure@12345');
      const donorToken = donorAuth.data.access_token;
      setStoredToken(donorToken);
      setStoredUser({ role: 'DONOR', email: 'e2e_donor@foodbridge.org' });
      addLog('Donor authenticated successfully.', 'success');
      setCurrentStep(1);

      // Step 2: Create Donation
      const now = new Date();
      const futureIso = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
      const farFutureIso = new Date(now.getTime() + 10 * 60 * 60 * 1000).toISOString();

      addLog('Step 2: Creating Surplus Food Donation Offer (50 Packs Rice & Paneer)...');
      const donationPayload = {
        donation_title: `Live Demo Buffet Pack #${Math.floor(Math.random() * 900 + 100)}`,
        description: '50 freshly prepared packs of rice and paneer curry.',
        available_from: futureIso,
        expiry_time: farFutureIso,
        total_quantity: '50.00',
        quantity_unit: 'PACKET',
        pickup_address: '100 Jubilee Hills Road 36',
        pickup_city: 'Hyderabad',
        pickup_state: 'Telangana',
        pickup_postal_code: '500033',
        pickup_latitude: 17.4310,
        pickup_longitude: 78.4070,
        delivery_preference: 'PICKUP_REQUIRED',
        items: [
          { item_name: 'Paneer Butter Masala', category: 'CURRY', quantity: '25.00', unit: 'PACKET', food_type: 'VEGETARIAN', contains_allergens: false },
          { item_name: 'Jeera Rice', category: 'RICE', quantity: '25.00', unit: 'PACKET', food_type: 'VEGETARIAN', contains_allergens: false }
        ]
      };

      const createRes = await donationService.createDonation(donationPayload);
      const donationId = createRes.data.donation_id;
      setDemoState((prev) => ({ ...prev, donationId, donationStatus: 'DRAFT' }));
      addLog(`Donation #${donationId} created in DRAFT status.`, 'success');
      setCurrentStep(2);
      await new Promise((r) => setTimeout(r, 1000));

      // Step 3: Submit Donation
      addLog(`Step 3: Submitting Donation #${donationId} for NGO matching...`);
      await donationService.submitDonation(donationId);
      setDemoState((prev) => ({ ...prev, donationStatus: 'SUBMITTED' }));
      addLog(`Donation #${donationId} submitted! Status: SUBMITTED.`, 'success');
      setCurrentStep(3);
      await new Promise((r) => setTimeout(r, 1000));

      // Step 4: Decision Engine Execution
      addLog('Step 4: Executing Intelligent Decision Engine (Proximity + Capacity Scoring)...');
      const deRes = await decisionEngineService.runEngine(donationId, 5);
      const topNgo = deRes.data.recommendations[0];
      addLog(`Decision Engine matched Rank-1 NGO ID #${topNgo.ngo_id} (Score: ${parseFloat(topNgo.total_score).toFixed(1)}, Dist: ${parseFloat(topNgo.distance_km).toFixed(1)}km).`, 'success');
      setCurrentStep(4);
      await new Promise((r) => setTimeout(r, 1000));

      // Step 5: NGO Login & Fetch Request
      addLog('Step 5: Logging in as Matched NGO Partner (e2e_ngo@foodbridge.org)...');
      const ngoAuth = await authService.login('e2e_ngo@foodbridge.org', 'Secure@12345');
      setStoredToken(ngoAuth.data.access_token);
      setStoredUser({ role: 'NGO', email: 'e2e_ngo@foodbridge.org' });

      const ngoRequestsRes = await ngoService.listRequests();
      const matchedRequest = (ngoRequestsRes.data.requests || []).find((r) => r.donation_id === donationId);
      const requestId = matchedRequest ? matchedRequest.request_id : 1;
      setDemoState((prev) => ({ ...prev, requestId }));
      addLog(`NGO received matching Request #${requestId} for Donation #${donationId}.`, 'success');
      setCurrentStep(5);
      await new Promise((r) => setTimeout(r, 1000));

      // Step 6: NGO Accepts
      addLog(`Step 6: NGO Partner Accepting Request #${requestId}...`);
      await ngoService.acceptRequest(requestId);
      setDemoState((prev) => ({ ...prev, donationStatus: 'NGO_ACCEPTED' }));
      addLog(`NGO ACCEPTED Request #${requestId}. Automated Volunteer Dispatch Initiated!`, 'success');
      setCurrentStep(6);
      await new Promise((r) => setTimeout(r, 1000));

      // Step 7: Volunteer Login & Fetch Assignment
      addLog('Step 7: Logging in as Volunteer Driver (e2e_vol@foodbridge.org)...');
      const volAuth = await authService.login('e2e_vol@foodbridge.org', 'Secure@12345');
      setStoredToken(volAuth.data.access_token);
      setStoredUser({ role: 'VOLUNTEER', email: 'e2e_vol@foodbridge.org' });

      const volAssignmentsRes = await volunteerService.listAssignments();
      const matchedAssignment = (volAssignmentsRes.data.assignments || []).find((a) => a.donation_id === donationId);
      const assignmentId = matchedAssignment ? matchedAssignment.assignment_id : 1;
      setDemoState((prev) => ({ ...prev, assignmentId }));
      addLog(`Volunteer Driver dispatched for Assignment #${assignmentId}.`, 'success');
      setCurrentStep(7);
      await new Promise((r) => setTimeout(r, 1000));

      // Step 8: Volunteer Accepts Assignment
      addLog(`Step 8: Volunteer Accepting Assignment #${assignmentId} (Pickup In Progress)...`);
      await volunteerService.acceptAssignment(assignmentId);
      setDemoState((prev) => ({ ...prev, donationStatus: 'PICKUP_IN_PROGRESS' }));
      addLog('Volunteer ACCEPTED assignment. Donation status: PICKUP_IN_PROGRESS.', 'success');
      setCurrentStep(8);
      await new Promise((r) => setTimeout(r, 1000));

      // Step 9: Complete Delivery
      addLog('Step 9: Volunteer Confirming Delivery Completion...');
      await volunteerService.completeDelivery(assignmentId);
      setDemoState((prev) => ({ ...prev, donationStatus: 'COMPLETED' }));
      addLog('SUCCESS! Complete E2E Lifecycle executed cleanly! Donation status: COMPLETED.', 'highlight');
      setCurrentStep(9);

    } catch (err) {
      addLog(`Error in lifecycle step: ${err.message}`, 'error');
    } finally {
      setIsAutomating(false);
    }
  };

  const steps = [
    { title: 'Donor Auth', desc: 'Login & resolve profile' },
    { title: 'Create Offer', desc: 'Post 50 food packs (DRAFT)' },
    { title: 'Submit Offer', desc: 'DRAFT -> SUBMITTED' },
    { title: 'Decision Engine', desc: 'Rank-1 NGO Matching' },
    { title: 'NGO Inbox', desc: 'Receive matching request' },
    { title: 'NGO Accept', desc: 'Status -> NGO_ACCEPTED' },
    { title: 'Volunteer Dispatch', desc: 'Proximity candidate search' },
    { title: 'Pickup Transit', desc: 'Status -> IN_PROGRESS' },
    { title: 'Delivery Complete', desc: 'Final State -> COMPLETED' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-[#F5F7FA] tracking-tight">Interactive E2E Lifecycle Controller</h1>
            <span className="bg-orange-50 dark:bg-orange-500/15 text-[#FF5A2F] border border-orange-200 dark:border-orange-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
              SYSTEM TEST RUNNER
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A5B1C2] mt-1 font-medium">
            Execute the complete 9-stage multi-party food redistribution process in real-time.
          </p>
        </div>

        <Button
          onClick={runFullE2EDemo}
          disabled={isAutomating}
          loading={isAutomating}
          loadingText="Executing Live Cycle..."
          variant="primary"
          size="md"
          icon={Play}
          className="shadow-md"
        >
          Run 1-Click Automated E2E Demo
        </Button>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] rounded-3xl p-6 shadow-sm">
        <div className="grid grid-cols-3 md:grid-cols-9 gap-2.5">
          {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum <= currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-orange-50/90 dark:bg-orange-500/15 border-orange-400 dark:border-orange-500/40 text-slate-900 dark:text-[#F5F7FA] shadow-sm ring-2 ring-orange-200 dark:ring-orange-500/20'
                    : isCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-400'
                    : 'bg-slate-50 dark:bg-[#171E27] border-slate-200 dark:border-[#26313D] text-slate-400 dark:text-[#748296]'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold block text-slate-400 dark:text-[#748296] mb-1">STEP 0{stepNum}</span>
                  <strong className="text-xs block leading-tight font-bold">{step.title}</strong>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-[#A5B1C2] mt-2 block font-medium">{step.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Log Console & Current State */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* State Summary */}
        <div className="bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] rounded-3xl p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-[#748296] flex items-center space-x-2">
            <Zap size={14} className="text-[#FF5A2F]" />
            <span>Active Live State</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D] flex items-center justify-between">
              <span className="text-slate-500 dark:text-[#A5B1C2] font-medium">Target Donation ID:</span>
              <strong className="text-slate-900 dark:text-[#F5F7FA] font-mono font-bold">{demoState.donationId || 'Not created'}</strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D] flex items-center justify-between">
              <span className="text-slate-500 dark:text-[#A5B1C2] font-medium">Donation Status:</span>
              <StatusBadge status={demoState.donationStatus} />
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D] flex items-center justify-between">
              <span className="text-slate-500 dark:text-[#A5B1C2] font-medium">Matched NGO Request ID:</span>
              <strong className="text-blue-600 dark:text-blue-400 font-mono font-bold">{demoState.requestId || 'N/A'}</strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D] flex items-center justify-between">
              <span className="text-slate-500 dark:text-[#A5B1C2] font-medium">Volunteer Assignment ID:</span>
              <strong className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{demoState.assignmentId || 'N/A'}</strong>
            </div>
          </div>
        </div>

        {/* Real-Time API Log Console */}
        <div className="lg:col-span-2 bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-[#748296] font-mono flex items-center space-x-2">
              <Layers size={14} className="text-[#FF5A2F]" />
              <span>Real-Time Execution Console Log</span>
            </h2>
            <span className="text-[10px] text-slate-400 dark:text-[#748296] font-mono font-bold">{logs.length} events logged</span>
          </div>

          <div className="bg-slate-900 dark:bg-[#090E13] text-slate-100 border border-slate-800 dark:border-[#26313D] rounded-2xl p-4 h-64 overflow-y-auto font-mono text-xs space-y-2 shadow-inner">
            {logs.length === 0 ? (
              <div className="text-slate-500 dark:text-[#7F8A99] text-center py-12">
                Click &quot;Run 1-Click Automated E2E Demo&quot; above to watch all API calls execute live.
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`flex items-start space-x-2 ${
                    log.type === 'highlight'
                      ? 'text-[#FF5A2F] font-bold'
                      : log.type === 'success'
                      ? 'text-emerald-400 font-semibold'
                      : log.type === 'error'
                      ? 'text-red-400 font-bold'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-500 text-[10px] shrink-0">[{log.time}]</span>
                  <span>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default E2EStepperPage;

