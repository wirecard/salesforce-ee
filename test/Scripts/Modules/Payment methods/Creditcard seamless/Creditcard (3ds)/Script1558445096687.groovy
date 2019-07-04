import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import internal.GlobalVariable as GlobalVariable

WebUI.waitForElementVisible(findTestObject('Payment methods/Creditcard/seamless/Input Firstname'), 10)

WebUI.setText(findTestObject('Payment methods/Creditcard/seamless/Input Firstname'), findTestData('creditcard').getValue(1, 2))

WebUI.waitForElementVisible(findTestObject('Payment methods/Creditcard/seamless/Input lastname'), 10)

WebUI.setText(findTestObject('Payment methods/Creditcard/seamless/Input lastname'), findTestData('creditcard').getValue(2, 2))

WebUI.waitForElementVisible(findTestObject('Payment methods/Creditcard/seamless/Input ccno'), 10)

WebUI.setText(findTestObject('Payment methods/Creditcard/seamless/Input ccno'), findTestData('creditcard').getValue(3, 2))

WebUI.waitForElementVisible(findTestObject('Payment methods/Creditcard/seamless/Input cvc'), 10)

WebUI.setText(findTestObject('Payment methods/Creditcard/seamless/Input cvc'), findTestData('creditcard').getValue(4, 2))

WebUI.waitForElementVisible(findTestObject('Payment methods/Creditcard/seamless/Select expiryMonth'), 10)

WebUI.setText(findTestObject('Payment methods/Creditcard/seamless/Select expiryMonth'), findTestData('creditcard').getValue(5, 2))

WebUI.waitForElementVisible(findTestObject('Payment methods/Creditcard/seamless/Select expiryYear'), 10)

WebUI.setText(findTestObject('Payment methods/Creditcard/seamless/Select expiryYear'), findTestData('creditcard').getValue(6, 2))

