import React from "react";
import { fireEvent,render,waitFor } from "@testing-library/react-native";
const mockLogout=jest.fn(async()=>{});
jest.mock("../src/context/AuthContext",()=>({useAuth:()=>({user:{_id:"demo-user",name:"Demo Student",username:"demo",email:"demo@blockpay.app",phone:"9876543210",collegeId:"BP-DEMO-01",role:"student"},logout:mockLogout})}));
jest.mock("../src/services/api",()=>({api:{}}));
import { ProfileScreen } from "../src/screens/profile/ProfileScreens";

test("profile logout uses an in-screen confirmation and signs out",async()=>{
  const view=await render(<ProfileScreen navigation={{navigate:jest.fn()}}/>);
  await fireEvent.press(view.getByText("Logout"));
  view.getByText("Log out of BlockPay?");
  await fireEvent.press(view.getByText("Confirm logout"));
  await waitFor(()=>expect(mockLogout).toHaveBeenCalledTimes(1));
});

test("profile completion card displays setup progress and steps", async () => {
  const ProfileCompletionCard = require("../src/components/ProfileCompletionCard").default;
  const view = await render(<ProfileCompletionCard />);
  view.getByText("PROFILE SETUP");
  view.getByText("Persona & Avatar");
  view.getByText("4-Digit Payment PIN");
});
