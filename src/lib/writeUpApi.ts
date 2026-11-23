export const WRITE_UP_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzJmeKZLBpnVNLsDMYHVLJQ1KE_exroksU9wJMNIbyZxpJtqju2bZZwsE6QE_2-7aI/exec";

export interface OfferSummary {
  programFee: string;
  registrationFee: string;
  discount: string;
  finalPayable: string;
}

export interface OfferCard {
  header: string;
  isSelf: boolean;
  partner: string;
  paymentType: string;
  totalPayable?: string | null;
  emi?: string | null;
  interestType?: string | null;
  interestPercent?: string | null;
  downPayment?: string | null;
  processingFee?: string | null;
}

export interface OfferCardsResponse {
  summary: OfferSummary | null;
  offers: OfferCard[];
}

export interface OfferFilters {
  university: string;
  course: string;
  payment?: string;
  loan?: string;
}

export async function fetchUniversities(): Promise<string[]> {
  try {
    const response = await fetch(`${WRITE_UP_WEBAPP_URL}?action=universities&format=json`);
    const json = await response.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch universities:", error);
    throw error;
  }
}

export async function fetchCourses(university: string): Promise<string[]> {
  if (!university) return [];
  try {
    const response = await fetch(`${WRITE_UP_WEBAPP_URL}?action=courses&university=${encodeURIComponent(university)}&format=json`);
    const json = await response.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (error) {
    console.error(`Failed to fetch courses for university ${university}:`, error);
    throw error;
  }
}

export async function fetchPaymentTypes(university: string, course: string): Promise<string[]> {
  if (!university || !course) return ["All"];
  try {
    const response = await fetch(`${WRITE_UP_WEBAPP_URL}?action=paymenttypes&university=${encodeURIComponent(university)}&course=${encodeURIComponent(course)}&format=json`);
    const json = await response.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return ["All"];
  } catch (error) {
    console.error("Failed to fetch payment types:", error);
    return ["All"];
  }
}

export async function fetchLoanPartners(university: string, course: string, payment: string = "All"): Promise<string[]> {
  if (!university || !course) return ["All"];
  try {
    const url = `${WRITE_UP_WEBAPP_URL}?action=loanpartners&university=${encodeURIComponent(university)}&course=${encodeURIComponent(course)}&payment=${encodeURIComponent(payment)}&format=json`;
    const response = await fetch(url);
    const json = await response.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return ["All"];
  } catch (error) {
    console.error("Failed to fetch loan partners:", error);
    return ["All"];
  }
}

export async function fetchOfferCards(filters: OfferFilters): Promise<OfferCardsResponse> {
  const { university, course, payment = "All", loan = "All" } = filters;
  if (!university || !course) {
    return { summary: null, offers: [] };
  }

  try {
    const url = `${WRITE_UP_WEBAPP_URL}?action=offercards&university=${encodeURIComponent(university)}&course=${encodeURIComponent(course)}&payment=${encodeURIComponent(payment)}&loan=${encodeURIComponent(loan)}`;
    const response = await fetch(url);
    const json = await response.json();

    if (json.success && json.data) {
      return {
        summary: json.data.summary || null,
        offers: json.data.offers || []
      };
    } else {
      if (json.message) {
        throw new Error(json.message);
      }
      return { summary: null, offers: [] };
    }
  } catch (error: any) {
    console.error("Failed to fetch offer cards:", error);
    throw error;
  }
}
