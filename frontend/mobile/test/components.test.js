import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import BalanceCard from "../src/components/BalanceCard";
import TransactionItem from "../src/components/TransactionItem";
import { Button, Empty, Input, Loading, Message } from "../src/components/UI";
describe("shared fintech components",()=>{
  test("balance renders and can be hidden",async()=>{const toggle=jest.fn();const view=await render(<BalanceCard wallet={{balance:10000,walletNumber:"BP1"}} onToggle={toggle}/>);view.getByText(/10,000/);await fireEvent.press(view.getByText("Hide"));expect(toggle).toHaveBeenCalled();await view.rerender(<BalanceCard wallet={{balance:10000,walletNumber:"BP1"}} hidden/>);view.getByText("INR ••••••");await view.unmount()});
  test("transaction item renders person, amount and status",async()=>{const {getByText}=await render(<TransactionItem userId="me" item={{receiverId:"me",senderId:{name:"Rahul"},amount:500,status:"successful",createdAt:new Date().toISOString()}}/>);getByText("Rahul");getByText(/500/);getByText("successful")});
  test("buttons prevent duplicate presses while loading",async()=>{const press=jest.fn();const {getByRole}=await render(<Button title="Pay" onPress={press} loading/>);await fireEvent.press(getByRole("button"));expect(press).not.toHaveBeenCalled()});
  test("input, message, loading and empty states render",async()=>{const {getByText,getByPlaceholderText}=await render(<><Input placeholder="Recipient"/><Message>Network error</Message><Loading label="Loading wallet"/><Empty label="No transactions yet"/></>);getByPlaceholderText("Recipient");getByText("Network error");getByText("Loading wallet");getByText("No transactions yet")});
});
