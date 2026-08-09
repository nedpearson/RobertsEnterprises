import { supabase } from '../supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assertEntitlement } from './entitlementService';

export interface ActiveBusinessContext {
  businessId: string | undefined;
  business: any | undefined;
  locationId: string | undefined;
  locationScope: string;
  authorizedLocations: any[];
  role: string | undefined;
  permissions: string[];
  dataPlane: 'production' | 'demo';
  loading: boolean;
  error: any;
}

export const useActiveBusinessContext = (locationFilter?: string): ActiveBusinessContext => {
  const { data: authUser } = useQuery({
    queryKey: ['authUserSession'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user || null;
    }
  });

  const userId = authUser?.id;

  const contextQuery = useQuery({
    queryKey: ['activeBusinessContext', userId],
    queryFn: async () => {
      try {
        if (!userId) return null;
        
        const { data: memberships, error: memError } = await supabase
          .from('business_memberships')
          .select('*, business:businesses(*)')
          .eq('user_id', userId);
          
        if (memError) {
          console.error("[activeBusinessContext] membership query error:", memError);
          throw memError;
        }
        
        console.log("[activeBusinessContext] memberships found:", JSON.stringify(memberships));
          
        if (!memberships || memberships.length === 0) return null;
        
        const primaryMembership = memberships[0];
        const business = primaryMembership.business;
        if (!business) {
          console.error("[activeBusinessContext] primaryMembership.business is null/undefined:", JSON.stringify(primaryMembership));
          throw new Error("[activeBusinessContext] primaryMembership.business is null/undefined");
        }
        const businessId = business.id;
        const role = primaryMembership.role;

        const { data: allLocations, error: locError } = await supabase
          .from('locations')
          .select('*')
          .eq('business_id', businessId);
          
        if (locError) {
          console.error("[activeBusinessContext] locations query error:", locError);
          throw locError;
        }
        
        let authorizedLocations = allLocations || [];
        if (role !== 'Owner' && role !== 'Manager') {
          const { data: permissions } = await supabase
            .from('location_permissions')
            .select('location_id')
            .eq('membership_id', primaryMembership.id);
          const allowedIds = new Set(permissions?.map((p: any) => p.location_id) || []);
          authorizedLocations = (allLocations || []).filter((loc: any) => allowedIds.has(loc.id));
        }

        const dataPlane = authUser?.email === 'demo123@gmail.com' ? 'demo' : 'production';

        return {
          businessId,
          business,
          authorizedLocations,
          role,
          permissions: [] as string[],
          dataPlane
        };
      } catch (err: any) {
        console.error("[activeBusinessContext] Caught error:", err.message || err);
        throw err;
      }
    },
    enabled: !!userId
  });

  const context = contextQuery.data;
  
  let locationScope = locationFilter || 'all';
  let locationId: string | undefined = undefined;

  if (context) {
    if (locationScope === 'all') {
      locationId = context.authorizedLocations[0]?.id;
    } else {
      const isAuth = context.authorizedLocations.some((loc: any) => loc.id === locationScope);
      if (isAuth) {
        locationId = locationScope;
      } else {
        locationId = context.authorizedLocations[0]?.id;
        locationScope = locationId || 'all';
      }
    }
  }

  return {
    businessId: context?.businessId,
    business: context?.business,
    locationId,
    locationScope,
    authorizedLocations: context?.authorizedLocations || [],
    role: context?.role,
    permissions: context?.permissions || [],
    dataPlane: context?.dataPlane || 'production',
    loading: contextQuery.isLoading,
    error: contextQuery.error
  };
};

export const useBusiness = () => {
  const context = useActiveBusinessContext();
  return {
    data: context.business,
    isLoading: context.loading,
    error: context.error
  };
};

// Fetchers
export const fetchAppointmentRequests = async (businessId: string, locationId?: string | 'all') => {
  let query = supabase.from('appointment_requests').select(`
    *,
    customer:customers(*)
  `).eq('business_id', businessId);
  
  if (locationId && locationId !== 'all') {
    query = query.eq('preferred_location_id', locationId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchAppointments = async (businessId: string, locationId?: string | 'all') => {
  let query = supabase.from('appointments').select(`
    *,
    customer:customers(*),
    employee:staff_profiles(*),
    room:rooms(*),
    service:appointment_services(*)
  `).eq('business_id', businessId);
  
  if (locationId && locationId !== 'all') {
    query = query.eq('location_id', locationId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchStaffProfiles = async (businessId: string, locationId?: string | 'all') => {
  const { data, error } = await supabase
    .from('business_memberships')
    .select(`
      id,
      user_id,
      role,
      profile:staff_profiles(*)
    `)
    .eq('business_id', businessId);
    
  if (error) throw error;
  
  let staff = data?.map((m: any) => ({
    ...m.profile,
    role: m.role,
    membership_id: m.id
  })).filter(s => s.id) || [];

  if (locationId && locationId !== 'all') {
    const { data: locPerms, error: permError } = await supabase
      .from('location_permissions')
      .select('membership_id')
      .eq('location_id', locationId);

    if (permError) throw permError;
    const allowedMembershipIds = new Set(locPerms?.map((lp: any) => lp.membership_id) || []);

    staff = data?.filter((m: any) => {
      return m.role === 'Owner' || m.role === 'Manager' || allowedMembershipIds.has(m.id);
    }).map((m: any) => ({
      ...m.profile,
      role: m.role,
      membership_id: m.id
    })).filter(s => s.id) || [];
  }

  return staff;
};

export const fetchRooms = async (businessId: string, locationId?: string | 'all') => {
  let query = supabase.from('rooms').select('*').eq('business_id', businessId).eq('active', true);
  if (locationId && locationId !== 'all') {
    query = query.eq('location_id', locationId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchEmployeeSchedules = async (businessId: string, locationId?: string | 'all') => {
  let query = supabase.from('employee_schedules').select(`
    *,
    employee:staff_profiles(*)
  `).eq('business_id', businessId);
  
  if (locationId && locationId !== 'all') {
    query = query.eq('location_id', locationId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchAppointmentHolds = async (businessId: string) => {
  const { data, error } = await supabase.from('appointment_holds')
    .select(`*`)
    .eq('business_id', businessId);
    
  if (error) throw error;
  return data;
};
export const fetchAppointment360 = async (appointmentId: string) => {
  try {
    const { data: appointment, error: aptError } = await supabase.from('appointments')
      .select(`
        *,
        customer:customers(*),
        employee:staff_profiles(*),
        room:rooms(*)
      `)
      .eq('id', appointmentId)
      .single();
      
    if (aptError) throw aptError;
    
    const { data: communications } = await supabase.from('communications').select('*').eq('appointment_id', appointmentId);
    const { data: files } = await supabase.from('files').select('*, file_links!inner(*)').eq('file_links.entity_id', appointmentId);
    const { data: notes } = await supabase.from('internal_notes').select('*').eq('entity_id', appointmentId).order('created_at', { ascending: false });
    const { data: financials } = await supabase.from('payments').select('*').eq('appointment_id', appointmentId);
    const { data: tasks } = await supabase.from('tasks').select('*').eq('entity_id', appointmentId).order('due_date', { ascending: true });
    const { data: history } = await supabase.from('appointment_audit_events').select('*').eq('appointment_id', appointmentId).order('created_at', { ascending: false });
      
    return {
      appointment,
      communications: communications || [],
      files: files || [],
      notes: notes || [],
      tasks: tasks || [],
      financials: financials || [],
      history: history || []
    };
  } catch (err) {
    console.warn('Failed to fetch appointment 360 data:', err);
    throw err;
  }
};

export const fetchAIRecommendations = async (requestId: string) => {
  const { data, error } = await supabase.from('appointment_assignment_recommendations')
    .select(`
      *,
      employee:staff_profiles(*)
    `)
    .eq('request_id', requestId)
    .order('score', { ascending: false });
    
  if (error) throw error;
  return data || [];
};

export const fetchCustomers = async (businessId: string) => {
  const { data, error } = await supabase.from('customers').select('*').eq('business_id', businessId);
  if (error) throw error;
  return data || [];
};

export const fetchServices = async (businessId: string) => {
  const { data, error } = await supabase.from('appointment_services').select('*').eq('business_id', businessId);
  if (error) throw error;
  return data || [];
};

// --- React Query Hooks ---

export const useAppointmentRequests = (businessId: string | undefined, locationId: string | 'all' = 'all') => {
  return useQuery({
    queryKey: ['appointment_requests', businessId, locationId],
    queryFn: () => fetchAppointmentRequests(businessId!, locationId),
    enabled: !!businessId
  });
};

export const useAppointments = (businessId: string | undefined, locationId: string | 'all' = 'all') => {
  return useQuery({
    queryKey: ['appointments', businessId, locationId],
    queryFn: () => fetchAppointments(businessId!, locationId),
    enabled: !!businessId
  });
};

export const useEmployeeSchedules = (businessId: string | undefined, locationId: string | 'all' = 'all') => {
  return useQuery({
    queryKey: ['employee_schedules', businessId, locationId],
    queryFn: () => fetchEmployeeSchedules(businessId!, locationId),
    enabled: !!businessId
  });
};

export const useAppointmentHolds = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ['appointment_holds', businessId],
    queryFn: () => fetchAppointmentHolds(businessId!),
    enabled: !!businessId
  });
};

export const useAppointment360 = (appointmentId: string | undefined) => {
  return useQuery({
    queryKey: ['appointment360', appointmentId],
    queryFn: () => fetchAppointment360(appointmentId!),
    enabled: !!appointmentId
  });
};

export const useStaffProfiles = (businessId?: string, locationId: string | 'all' = 'all') => {
  const activeCtx = useActiveBusinessContext();
  const bId = businessId || activeCtx.businessId;
  return useQuery({
    queryKey: ['staff_profiles', bId, locationId],
    queryFn: () => fetchStaffProfiles(bId!, locationId),
    enabled: !!bId
  });
};

export const useRooms = (businessId?: string, locationId: string | 'all' = 'all') => {
  const activeCtx = useActiveBusinessContext();
  const bId = businessId || activeCtx.businessId;
  return useQuery({
    queryKey: ['rooms', bId, locationId],
    queryFn: () => fetchRooms(bId!, locationId),
    enabled: !!bId
  });
};

export const useAIRecommendations = (requestId: string | undefined) => {
  return useQuery({
    queryKey: ['ai_recommendations', requestId],
    queryFn: () => fetchAIRecommendations(requestId!),
    enabled: !!requestId
  });
};

export const useCustomers = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ['customers', businessId],
    queryFn: () => fetchCustomers(businessId!),
    enabled: !!businessId
  });
};

export const useServices = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ['services', businessId],
    queryFn: () => fetchServices(businessId!),
    enabled: !!businessId
  });
};

export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string, status: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({ confirmation_status: status })
        .eq('id', appointmentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment360', variables.appointmentId] });
    }
  });
};

export const useAssignStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId, employeeId }: { appointmentId: string, employeeId: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({ employee_id: employeeId })
        .eq('id', appointmentId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment360', variables.appointmentId] });
    }
  });
};

// --- Transactional RPC Mutations ---

export const useAssignAppointmentRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      requestId: string;
      employeeId: string;
      roomId: string;
      startAt: string;
      endAt: string;
    }) => {
      const { data, error } = await supabase.rpc('assign_appointment_request', {
        p_request_id: params.requestId,
        p_employee_id: params.employeeId,
        p_room_id: params.roomId,
        p_start_at: params.startAt,
        p_end_at: params.endAt
      });
      
      if (error) throw error;
      return data; // Returns the new appointment UUID
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
    }
  });
};

export const useRescheduleAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      appointmentId: string;
      newStartAt: string;
      newEndAt: string;
      newEmployeeId: string;
    }) => {
      const { data, error } = await supabase.rpc('reschedule_appointment', {
        p_appointment_id: params.appointmentId,
        p_new_start_at: params.newStartAt,
        p_new_end_at: params.newEndAt,
        p_new_employee_id: params.newEmployeeId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });
};

export const useGenerateAIRecommendations = (businessId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      if (businessId) {
        await assertEntitlement('scheduling.ai', businessId);
      }
      const { error } = await supabase.rpc('generate_ai_recommendations', {
        p_request_id: requestId
      });
      if (error) throw error;
    },
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries({ queryKey: ['ai_recommendations', requestId] });
    }
  });
};

export const useAddAppointmentNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId, content, businessId }: { appointmentId: string, content: string, businessId: string }) => {
      const { data, error } = await supabase.from('internal_notes').insert({
        entity_id: appointmentId,
        entity_type: 'appointment',
        business_id: businessId,
        content
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointment360', variables.appointmentId] });
    }
  });
};

export const useAddAppointmentTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId, title, businessId }: { appointmentId: string, title: string, businessId: string }) => {
      const { data, error } = await supabase.from('tasks').insert({
        entity_id: appointmentId,
        entity_type: 'appointment',
        business_id: businessId,
        title,
        status: 'pending'
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointment360', variables.appointmentId] });
    }
  });
};

export const useAddCommunication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId, content, businessId }: { appointmentId: string, content: string, businessId: string }) => {
      const { data, error } = await supabase.from('communications').insert({
        appointment_id: appointmentId,
        business_id: businessId,
        content,
        type: 'sms',
        direction: 'outbound',
        status: 'sent'
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointment360', variables.appointmentId] });
    }
  });
};


export const usePublishSchedules = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId, locationId }: { businessId: string, locationId?: string }) => {
      const { error } = await supabase.rpc('publish_employee_schedule', {
        p_business_id: businessId,
        p_location_id: locationId === 'all' ? null : locationId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_schedules'] });
    }
  });
};

export const useCreateRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      businessId: string;
      locationId: string;
      customer: {
        id?: string;
        name?: string;
        email?: string;
        phone?: string;
        sms_consent?: boolean;
        email_consent?: boolean;
        accessibility_needs?: string;
        language?: string;
      };
      request: {
        service_id: string;
        preferred_employee_id?: string;
        preferred_date_1: string;
        preferred_window_1?: string;
        preferred_date_2?: string;
        preferred_window_2?: string;
        flexible_date?: boolean;
        flexible_location?: boolean;
        notes?: string;
        intake_source?: string;
        number_of_guests?: number;
        event_date?: string;
        budget_cents?: number;
        designer_interest?: string;
        campaign_attribution?: string;
      };
    }) => {
      let customerId = params.customer.id;
      if (!customerId) {
        const { data: newCust, error: custError } = await supabase
          .from('customers')
          .insert({
            business_id: params.businessId,
            location_id: params.locationId,
            name: params.customer.name,
            email: params.customer.email,
            phone: params.customer.phone,
            sms_consent: params.customer.sms_consent || false,
            email_consent: params.customer.email_consent || false,
            accessibility_needs: params.customer.accessibility_needs,
            language: params.customer.language || 'en',
            status: 'Active'
          })
          .select('id')
          .single();
        if (custError) throw custError;
        customerId = newCust.id;
      } else {
        await supabase
          .from('customers')
          .update({
            sms_consent: params.customer.sms_consent,
            email_consent: params.customer.email_consent,
            accessibility_needs: params.customer.accessibility_needs,
            language: params.customer.language
          })
          .eq('id', customerId);
      }

      const { data: newReq, error: reqError } = await supabase
        .from('appointment_requests')
        .insert({
          business_id: params.businessId,
          preferred_location_id: params.locationId,
          customer_id: customerId,
          service_id: params.request.service_id,
          preferred_employee_id: params.request.preferred_employee_id || null,
          preferred_date_1: params.request.preferred_date_1,
          preferred_window_1: params.request.preferred_window_1 || null,
          preferred_date_2: params.request.preferred_date_2 || null,
          preferred_window_2: params.request.preferred_window_2 || null,
          flexible_date: params.request.flexible_date || false,
          flexible_location: params.request.flexible_location || false,
          notes: params.request.notes,
          intake_source: params.request.intake_source || 'Employee-Entered Web Request',
          number_of_guests: params.request.number_of_guests || 1,
          event_date: params.request.event_date || null,
          budget_cents: params.request.budget_cents || null,
          designer_interest: params.request.designer_interest || null,
          campaign_attribution: params.request.campaign_attribution || null,
          status: 'new'
        })
        .select('*')
        .single();
      if (reqError) throw reqError;

      await supabase.from('appointment_audit_events').insert({
        business_id: params.businessId,
        location_id: params.locationId,
        request_id: newReq.id,
        event_type: 'request_created',
        new_values: { request: newReq }
      });

      return newReq;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });
};

export const useCreateHold = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      requestId: string;
      employeeId: string;
      businessId: string;
      locationId: string;
      roomId: string | null;
      startAt: string;
      endAt: string;
      expiresInMinutes?: number;
    }) => {
      const { data, error } = await supabase.rpc('create_appointment_hold', {
        p_request_id: params.requestId,
        p_employee_id: params.employeeId,
        p_business_id: params.businessId,
        p_location_id: params.locationId,
        p_room_id: params.roomId || null,
        p_start_at: params.startAt,
        p_end_at: params.endAt,
        p_expires_in_minutes: params.expiresInMinutes || 15
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment_holds'] });
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
    }
  });
};

export const useConfirmHold = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ holdId }: { holdId: string }) => {
      const { data, error } = await supabase.rpc('confirm_appointment_hold', {
        p_hold_id: holdId
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment_holds'] });
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
    }
  });
};

export const useTransitionRequestStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, newStatus, reason }: { requestId: string, newStatus: string, reason?: string }) => {
      const { error } = await supabase.rpc('transition_request_status', {
        p_request_id: requestId,
        p_new_status: newStatus,
        p_reason: reason || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
    }
  });
};

export const useCreateDirectAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      businessId: string;
      locationId: string;
      customerId: string;
      serviceId: string;
      employeeId: string;
      roomId: string | null;
      startAt: string;
      endAt: string;
    }) => {
      const { data, error } = await supabase.rpc('create_direct_appointment', {
        p_business_id: params.businessId,
        p_location_id: params.locationId,
        p_customer_id: params.customerId,
        p_service_id: params.serviceId,
        p_employee_id: params.employeeId,
        p_room_id: params.roomId || null,
        p_start_at: params.startAt,
        p_end_at: params.endAt
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });
};

export const useHandleCallout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, date, reason }: { employeeId: string, date: string, reason?: string }) => {
      const { error } = await supabase.rpc('handle_employee_callout', {
        p_employee_id: employeeId,
        p_date: date,
        p_reason: reason || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_schedules'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });
};

export const useCheckInAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId }: { appointmentId: string }) => {
      const { error } = await supabase.rpc('check_in_appointment', {
        p_appointment_id: appointmentId
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment360', variables.appointmentId] });
    }
  });
};

export const useStartAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId }: { appointmentId: string }) => {
      const { error } = await supabase.rpc('start_appointment', {
        p_appointment_id: appointmentId
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment360', variables.appointmentId] });
    }
  });
};

export const useCompleteAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId, outcome, notes }: { appointmentId: string, outcome: string, notes?: string }) => {
      const { error } = await supabase.rpc('complete_appointment', {
        p_appointment_id: appointmentId,
        p_outcome: outcome,
        p_notes: notes || null
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment360', variables.appointmentId] });
    }
  });
};

// --- Workforce Scheduling Mutations ---

export const useCreateEmployeeSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      businessId: string;
      locationId: string;
      employeeId: string;
      shiftDate: string;
      startAt: string;
      endAt: string;
      status?: string;
      notes?: string;
      shiftType?: string;
      department?: string;
      unpaidBreakMinutes?: number;
      paidBreakMinutes?: number;
    }) => {
      const { data, error } = await supabase.from('employee_schedules').insert({
        business_id: params.businessId,
        location_id: params.locationId,
        employee_id: params.employeeId,
        shift_date: params.shiftDate,
        start_at: params.startAt,
        end_at: params.endAt,
        status: params.status || 'draft',
        notes: params.notes,
        shift_type: params.shiftType,
        department: params.department,
        unpaid_break_minutes: params.unpaidBreakMinutes,
        paid_break_minutes: params.paidBreakMinutes
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_schedules'] });
    }
  });
};

export const useUpdateEmployeeSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      locationId?: string;
      employeeId?: string;
      shiftDate?: string;
      startAt?: string;
      endAt?: string;
      status?: string;
      notes?: string;
      shiftType?: string;
      department?: string;
      unpaidBreakMinutes?: number;
      paidBreakMinutes?: number;
    }) => {
      const updates: any = {};
      if (params.locationId) updates.location_id = params.locationId;
      if (params.employeeId) updates.employee_id = params.employeeId;
      if (params.shiftDate) updates.shift_date = params.shiftDate;
      if (params.startAt) updates.start_at = params.startAt;
      if (params.endAt) updates.end_at = params.endAt;
      if (params.status) updates.status = params.status;
      if (params.notes !== undefined) updates.notes = params.notes;
      if (params.shiftType) updates.shift_type = params.shiftType;
      if (params.department) updates.department = params.department;
      if (params.unpaidBreakMinutes !== undefined) updates.unpaid_break_minutes = params.unpaidBreakMinutes;
      if (params.paidBreakMinutes !== undefined) updates.paid_break_minutes = params.paidBreakMinutes;

      const { data, error } = await supabase.from('employee_schedules').update(updates).eq('id', params.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_schedules'] });
    }
  });
};

export const useDeleteEmployeeSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employee_schedules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_schedules'] });
    }
  });
};

export const useFetchTimeOffRequests = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ['time_off_requests', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('time_off_requests').select('*').eq('business_id', businessId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId
  });
};
