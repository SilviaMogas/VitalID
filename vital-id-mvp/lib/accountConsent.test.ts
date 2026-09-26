import {expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
vi.mock("@/lib/supabaseServer",()=>({supabaseConfig:()=>({}),authRequest:vi.fn(),setSessionCookies:vi.fn()}));
import {authRequest} from "@/lib/supabaseServer";
import {POST} from "@/app/api/auth/route";
it("does not forward account details to Supabase without essential account consent",async()=>{
  const req=new NextRequest("http://localhost/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"signup",email:"fictional@example.com",password:"fictional-password"})});
  expect((await POST(req)).status).toBe(403);
  expect(authRequest).not.toHaveBeenCalled();
});
