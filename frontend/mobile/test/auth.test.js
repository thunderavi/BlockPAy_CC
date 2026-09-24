import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
const mockLogin=jest.fn();const mockRegister=jest.fn();
jest.mock("../src/context/AuthContext",()=>({useAuth:()=>({login:mockLogin,register:mockRegister})}));
jest.mock("../src/services/api",()=>({DEMO_MODE:false,api:{forgotPassword:jest.fn()}}));
import { LoginScreen, RegisterScreen } from "../src/screens/auth/AuthScreens";
describe("authentication screens",()=>{
  test("login and registration screens render",async()=>{const nav={navigate:jest.fn()};const loginView=await render(<LoginScreen navigation={nav}/>);loginView.getByText("Sign in");await loginView.unmount();const registerView=await render(<RegisterScreen/>);registerView.getByText("Create account")});
  test("login validates required values",async()=>{const {getByText}=await render(<LoginScreen navigation={{navigate:jest.fn()}}/>);await fireEvent.press(getByText("Login"));getByText("Email and password are required.");expect(mockLogin).not.toHaveBeenCalled()});
  test("login submits entered credentials",async()=>{mockLogin.mockResolvedValueOnce({});const {getByLabelText,getByText}=await render(<LoginScreen navigation={{navigate:jest.fn()}}/>);await fireEvent.changeText(getByLabelText("Email"),"student@test.dev");await fireEvent.changeText(getByLabelText("Password"),"secret1");await fireEvent.press(getByText("Login"));await waitFor(()=>expect(mockLogin).toHaveBeenCalledWith({email:"student@test.dev",password:"secret1"}))});
  test("login API errors are visible",async()=>{mockLogin.mockRejectedValueOnce(new Error("Invalid email or password"));const {getByLabelText,getByText}=await render(<LoginScreen navigation={{navigate:jest.fn()}}/>);await fireEvent.changeText(getByLabelText("Email"),"student@test.dev");await fireEvent.changeText(getByLabelText("Password"),"bad");await fireEvent.press(getByText("Login"));await waitFor(()=>getByText("Invalid email or password"))});
  test("registration validates incomplete data",async()=>{const {getByText}=await render(<RegisterScreen/>);await fireEvent.press(getByText("Create Account"));getByText(/Please fill all required fields/);expect(mockRegister).not.toHaveBeenCalled()});
});
