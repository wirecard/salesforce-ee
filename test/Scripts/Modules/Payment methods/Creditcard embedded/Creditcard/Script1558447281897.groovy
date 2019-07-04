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

WebUI.delay(10)

WebUI.switchToFrame(findTestObject('Payment methods/Creditcard/embedded/Iframe'), 10)

WebUI.waitForElementVisible(findTestObject('Payment methods/Creditcard/embedded/Input firstName'), 10)

WebUI.setText(findTestObject('Payment methods/Creditcard/embedded/Input firstName'), findTestData('creditcard').getValue(
        1, 1))

WebUI.waitForElementVisible(findTestObject('Payment methods/Creditcard/embedded/Input lastName'), 10)

WebUI.setText(findTestObject('Payment methods/Creditcard/embedded/Input lastName'), findTestData('creditcard').getValue(
        2, 1))

WebUI.waitForElementVisible(findTestObject('Payment methods/Creditcard/embedded/Input ccNo'), 10)

WebUI.setText(findTestObject('Payment methods/Creditcard/embedded/Input ccNo'), findTestData('creditcard').getValue(3, 1))

WebUI.waitForElementVisible(findTestObject('Payment methods/Creditcard/embedded/Input cvc'), 10)

WebUI.setText(findTestObject('Payment methods/Creditcard/embedded/Input cvc'), findTestData('creditcard').getValue(4, 1))

WebUI.waitForElementVisible(findTestObject('Payment methods/Creditcard/embedded/Select expiryMonth'), 10)

WebUI.selectOptionByValue(findTestObject('Payment methods/Creditcard/embedded/Select expiryMonth'), findTestData('creditcard').getValue(
        5, 1), false)

WebUI.waitForElementVisible(findTestObject('Payment methods/Creditcard/embedded/Select expiryYear'), 10)

WebUI.selectOptionByValue(findTestObject('Payment methods/Creditcard/embedded/Select expiryYear'), findTestData('creditcard').getValue(
        6, 1), false)

WebUI.click(findTestObject('Payment methods/Creditcard/embedded/Button submit'))

WebUI.switchToDefaultContent()

